from datetime import datetime, timedelta

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import CustomerProfile, ServiceItem, ServiceRequest
from .serializers import CustomerProfileSerializer, ServiceRequestSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register_customer(request):
    print("Received data:", request.data)  # Debug print
    serializer = CustomerProfileSerializer(data=request.data)
    if not serializer.is_valid():
        print("Validation errors:", serializer.errors)  # Debug print
    if serializer.is_valid():
        customer = serializer.save()
        # Generate token for the new user
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(customer.user)

        return Response(
            {
                "user": CustomerProfileSerializer(customer).data,
                "token": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_customer(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"message": "Please provide both email and password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=email, password=password)

    if user:
        try:
            customer = CustomerProfile.objects.get(user=user)
            serializer = CustomerProfileSerializer(customer)
            return Response({"message": "Login successful", "data": serializer.data})
        except CustomerProfile.DoesNotExist:
            return Response(
                {"message": "Customer profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    return Response(
        {"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
    )


class ServiceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAuthenticated]

    def validate_appointment_time(self, date_str, time_str):
        """Validate that the appointment time is valid and available"""
        try:
            # Parse the date and time
            appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            appointment_time = datetime.strptime(time_str, "%I:%M %p").time()
            appointment_datetime = timezone.make_aware(
                datetime.combine(appointment_date, appointment_time)
            )

            # Validate basic rules
            now = timezone.now()
            max_date = now + timedelta(days=30)

            # For same-day appointments, ensure we're at least 10 minutes in the future
            min_appointment_time = now + timedelta(minutes=10)
            if appointment_datetime < min_appointment_time:
                raise ValidationError(
                    "Appointments must be at least 10 minutes in the future"
                )

            if appointment_datetime.date() > max_date.date():
                raise ValidationError(
                    "Cannot schedule appointments more than 30 days in advance"
                )

            # Validate business hours (9 AM - 4 PM)
            hour = appointment_datetime.hour
            if (
                hour < 9
                or hour > 16
                or (hour == 16 and appointment_datetime.minute > 0)
            ):
                raise ValidationError("Appointments must be between 9 AM and 4 PM")

            # Validate 10-minute intervals
            if appointment_datetime.minute % 10 != 0:
                raise ValidationError(
                    "Appointments must be scheduled in 10-minute intervals"
                )

            # Check for lunch hour (12 PM - 1 PM)
            if hour == 12:
                raise ValidationError(
                    "No appointments available during lunch hour (12 PM - 1 PM)"
                )

            # Check for existing appointments
            existing_appointment = ServiceRequest.objects.filter(
                appointment_date=appointment_date, appointment_time=time_str
            ).exists()

            if existing_appointment:
                raise ValidationError("This time slot is already booked")

            return True

        except ValueError:
            raise ValidationError("Invalid date or time format")

    def create(self, request, *args, **kwargs):
        try:
            # Debug logging
            print("User:", request.user)
            print("Is authenticated:", request.user.is_authenticated)

            # Validate customer profile exists
            try:
                customer_profile = request.user.customerprofile
            except CustomerProfile.DoesNotExist:
                return Response(
                    {"detail": "Customer profile not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate appointment time before creating request
            date = request.data.get("appointment_date")
            time = request.data.get("appointment_time")
            self.validate_appointment_time(date, time)

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Error in create view: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        return ServiceRequest.objects.filter(
            customer=self.request.user.customerprofile
        ).order_by("-created_at")

    def perform_create(self, serializer):
        try:
            # Get the customer profile
            customer = self.request.user.customerprofile
            # Pass customer to serializer.save()
            serializer.save(customer=customer)
        except CustomerProfile.DoesNotExist:
            raise ValidationError("Customer profile not found")
        except Exception as e:
            print(f"Error in perform_create: {str(e)}")
            raise ValidationError(str(e))

    @action(detail=False, methods=["get"])
    def available_slots(self, request):
        """Return available time slots for a given date"""
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Parse the requested date
            requested_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            current_datetime = timezone.now()

            # Generate base time slots
            time_slots = []
            for hour in range(9, 17):  # 9 AM to 4 PM
                if hour == 12:  # Skip lunch hour
                    continue
                for minute in range(0, 60, 10):
                    slot_time = timezone.make_aware(
                        datetime.combine(requested_date, time(hour, minute))
                    )

                    # Skip slots in the past for today
                    if requested_date == current_datetime.date():
                        if slot_time <= current_datetime + timedelta(minutes=10):
                            continue

                    # Format the time slot
                    formatted_time = slot_time.strftime("%I:%M %p")
                    time_slots.append(formatted_time)

            # Remove booked slots
            booked_slots = ServiceRequest.objects.filter(
                appointment_date=requested_date
            ).values_list("appointment_time", flat=True)

            available_slots = [slot for slot in time_slots if slot not in booked_slots]

            return Response(available_slots)

        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
