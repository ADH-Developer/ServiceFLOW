import zoneinfo
from datetime import datetime, time, timedelta

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
            # Debug logging
            print(f"Validating appointment - Date: {date_str}, Time: {time_str}")

            # Parse the incoming time (24-hour format HH:mm)
            hour, minute = map(int, time_str.split(":"))

            # Get shop's timezone (EST)
            shop_tz = zoneinfo.ZoneInfo("America/New_York")

            # Get current time in shop's timezone
            now = timezone.now().astimezone(shop_tz)
            print(f"Current time in shop timezone: {now}")

            # Create appointment datetime in shop's timezone
            appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            print(f"Appointment date: {appointment_date}")
            print(f"Current date in shop timezone: {now.date()}")

            # Explicitly check if this is a future date
            is_future_date = appointment_date > now.date()
            print(f"Is future date: {is_future_date}")

            # Create the full appointment datetime
            appointment_datetime = datetime.combine(
                appointment_date, time(hour, minute)
            )
            appointment_datetime = timezone.make_aware(appointment_datetime, shop_tz)
            print(f"Full appointment datetime: {appointment_datetime}")

            # Only apply 10-minute buffer for same-day appointments
            if not is_future_date:
                min_appointment_time = now + timedelta(minutes=10)
                print(f"Minimum appointment time: {min_appointment_time}")
                if appointment_datetime < min_appointment_time:
                    raise ValidationError(
                        "Same-day appointments must be at least 10 minutes in the future"
                    )

            # Business hours check (9 AM - 4 PM EST)
            if appointment_datetime.hour < 9 or appointment_datetime.hour >= 16:
                raise ValidationError("Appointments must be between 9 AM and 4 PM EST")

            # 10-minute interval check
            if appointment_datetime.minute % 10 != 0:
                raise ValidationError(
                    "Appointments must be scheduled in 10-minute intervals"
                )

            return appointment_datetime

        except ValueError as e:
            print(f"Validation error: {str(e)}")
            raise ValidationError(f"Invalid date or time format: {str(e)}")
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            raise ValidationError(str(e))

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
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Parse the requested date
            requested_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            shop_tz = zoneinfo.ZoneInfo("America/New_York")
            current_datetime = timezone.now().astimezone(shop_tz)

            # Check if requested date is today or future
            is_next_day = requested_date > current_datetime.date()

            # Generate base time slots
            time_slots = []
            for hour in range(9, 17):  # 9 AM to 4 PM
                if hour == 12:  # Skip lunch hour
                    continue
                for minute in range(0, 60, 10):
                    slot_time = datetime.combine(requested_date, time(hour, minute))
                    slot_time = timezone.make_aware(slot_time, shop_tz)

                    # Only apply the 10-minute buffer for today's appointments
                    if not is_next_day:
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
