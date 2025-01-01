import logging
import zoneinfo
from datetime import datetime, time, timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .cache import AppointmentCache, WorkflowCache
from .models import (
    BusinessHours,
    Comment,
    CustomerProfile,
    Label,
    ServiceItem,
    ServiceRequest,
)
from .serializers import (
    CommentSerializer,
    CustomerProfileSerializer,
    LabelSerializer,
    ServiceRequestSerializer,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def register_customer(request):
    print("Received registration data:", request.data)  # Debug print
    serializer = CustomerProfileSerializer(data=request.data)

    if not serializer.is_valid():
        print("Validation errors:", serializer.errors)  # Debug print
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        customer = serializer.save()
        refresh = RefreshToken.for_user(customer.user)

        return Response(
            {
                "user": CustomerProfileSerializer(customer).data,
                "token": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        print("Error during registration:", str(e))  # Debug print
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


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

    # Try authenticating with email as username first
    user = authenticate(username=email, password=password)

    # If that fails, try to find user by email and authenticate with their username
    if not user:
        try:
            from django.contrib.auth.models import User

            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass

    if user:
        refresh = RefreshToken.for_user(user)

        # Add user role information
        user_data = {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "groups": list(user.groups.values_list("name", flat=True)),
        }

        # Don't require CustomerProfile for staff/superusers
        if user.is_staff or user.is_superuser:
            return Response(
                {
                    "message": "Login successful",
                    "data": {
                        "user": user_data,
                        "token": {
                            "access": str(refresh.access_token),
                            "refresh": str(refresh),
                        },
                    },
                }
            )

        try:
            customer = CustomerProfile.objects.get(user=user)
            return Response(
                {
                    "message": "Login successful",
                    "data": {
                        "user": user_data,
                        "token": {
                            "access": str(refresh.access_token),
                            "refresh": str(refresh),
                        },
                    },
                }
            )
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
    basename = "service-request"

    @action(detail=False, methods=["get"], url_path="business-hours")
    def business_hours(self, request):
        """Get business hours configuration"""
        try:
            business_hours = BusinessHours.objects.all().order_by("day_of_week")
            hours_data = []

            for bh in business_hours:
                hours_data.append(
                    {
                        "day": dict(BusinessHours.DAYS_OF_WEEK)[bh.day_of_week],
                        "day_of_week": bh.day_of_week,
                        "is_open": bh.is_open,
                        "start_time": (
                            bh.start_time.strftime("%H:%M") if bh.start_time else None
                        ),
                        "end_time": (
                            bh.end_time.strftime("%H:%M") if bh.end_time else None
                        ),
                        "allow_after_hours_dropoff": bh.allow_after_hours_dropoff,
                    }
                )

            return Response(hours_data)
        except Exception as e:
            logger.error(f"Error fetching business hours: {e}")
            return Response(
                {"error": "Failed to fetch business hours"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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

            # Check business hours
            within_hours, allows_after_hours = (
                BusinessHours.is_time_within_business_hours(appointment_datetime)
            )

            if not within_hours:
                business_hours = BusinessHours.objects.get(
                    day_of_week=appointment_datetime.weekday()
                )
                if not business_hours.is_open:
                    raise ValidationError(
                        "This day is not available for appointments as the business is closed."
                    )
                else:
                    raise ValidationError(
                        f"Appointments must be scheduled during business hours: "
                        f"{business_hours.start_time.strftime('%I:%M %p')} - "
                        f"{business_hours.end_time.strftime('%I:%M %p')}"
                    )

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
                # Check if customer profile exists without assigning it
                request.user.customerprofile
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
        if self.request.user.is_staff:
            return ServiceRequest.objects.all().order_by("-created_at")
        return ServiceRequest.objects.filter(
            customer=self.request.user.customerprofile
        ).order_by("-created_at")

    def perform_create(self, serializer):
        with transaction.atomic():
            service_request = serializer.save()

            # Send real-time update for appointments if it's for today
            if service_request.appointment_date.date() == timezone.localtime().date():
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    "appointments",
                    {
                        "type": "appointment_update",
                        "action": "create",
                        "appointment": ServiceRequestSerializer(service_request).data,
                    },
                )

    def perform_update(self, serializer):
        with transaction.atomic():
            service_request = serializer.save()

            # Send real-time update for appointments if it's for today
            if service_request.appointment_date.date() == timezone.localtime().date():
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    "appointments",
                    {
                        "type": "appointment_update",
                        "action": "update",
                        "appointment": ServiceRequestSerializer(service_request).data,
                    },
                )

    def perform_destroy(self, instance):
        # Send real-time update for appointments if it's for today
        if instance.appointment_date.date() == timezone.localtime().date():
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_update",
                    "action": "delete",
                    "appointment_id": instance.id,
                },
            )
        instance.delete()

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

            # Get business hours for the requested day
            day_of_week = requested_date.weekday()
            try:
                business_hours = BusinessHours.objects.get(day_of_week=day_of_week)
                if not business_hours.is_open:
                    return Response([])  # Return empty list for closed days
            except BusinessHours.DoesNotExist:
                return Response([])  # Return empty list if no business hours set

            # Check if requested date is today or future
            is_next_day = requested_date > current_datetime.date()

            # Generate base time slots based on business hours
            time_slots = []
            if business_hours.start_time and business_hours.end_time:
                start_hour = business_hours.start_time.hour
                end_hour = business_hours.end_time.hour
                start_minute = business_hours.start_time.minute
                end_minute = business_hours.end_time.minute

                current_time = datetime.combine(
                    requested_date, business_hours.start_time
                )
                end_time = datetime.combine(requested_date, business_hours.end_time)

                while current_time <= end_time:
                    if current_time.hour == 12:  # Skip lunch hour
                        current_time = current_time.replace(hour=13, minute=0)
                        continue

                    slot_time = timezone.make_aware(current_time, shop_tz)

                    # Only apply the 10-minute buffer for today's appointments
                    if not is_next_day:
                        if slot_time <= current_datetime + timedelta(minutes=10):
                            current_time = current_time + timedelta(minutes=10)
                            continue

                    # Format the time slot
                    formatted_time = slot_time.strftime("%I:%M %p")
                    time_slots.append(formatted_time)
                    current_time = current_time + timedelta(minutes=10)

            # Remove booked slots
            booked_slots = ServiceRequest.objects.filter(
                appointment_date=requested_date
            ).values_list("appointment_time", flat=True)
            booked_slots = [slot.strftime("%I:%M %p") for slot in booked_slots]

            available_slots = [slot for slot in time_slots if slot not in booked_slots]

            return Response(available_slots)

        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error generating available slots: {e}")
            return Response(
                {"error": "Failed to generate available slots"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="pending/count")
    def pending_count(self, request):
        """Get count of pending appointments, using cache"""
        logger.debug(f"Accessing pending_count endpoint. User: {request.user}")
        try:
            # Get count from cache
            count = AppointmentCache.get_pending_count()
            if count is None:
                # Fallback to database if cache fails
                count = ServiceRequest.objects.filter(status="pending").count()

            logger.debug(f"Found {count} pending requests")
            return Response({"count": count})
        except Exception as e:
            logger.error(f"Error in pending_count: {str(e)}")
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        today = timezone.now().date()
        appointments = (
            ServiceRequest.objects.filter(appointment_date=today)
            .select_related("customer", "vehicle")
            .order_by("appointment_time")
        )
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)


class WorkflowViewSet(viewsets.ViewSet):
    """
    ViewSet for workflow board operations
    """

    permission_classes = [IsAuthenticated, IsAdminUser]  # Only staff can access

    def list(self, request):
        """Get the current board state"""
        try:
            # Get board state from cache/DB
            board_state = WorkflowCache.get_board_state()

            # Get full service request data for each ID
            columns = {}
            for column, cards in board_state.items():
                if cards:  # Only query if there are cards
                    # Extract IDs from the card objects
                    request_ids = [card["id"] for card in cards]
                    requests = ServiceRequest.objects.filter(id__in=request_ids)

                    # Create a mapping of id to position
                    position_map = {card["id"]: card["position"] for card in cards}

                    # Serialize and add position information
                    serialized_requests = ServiceRequestSerializer(
                        requests, many=True
                    ).data
                    for req in serialized_requests:
                        req["workflow_position"] = position_map.get(req["id"], 0)

                    # Sort by position
                    columns[column] = sorted(
                        serialized_requests, key=lambda x: x["workflow_position"]
                    )
                else:
                    columns[column] = []  # Empty column

            return Response(
                {
                    "columns": columns,
                    "column_order": [
                        c[0] for c in ServiceRequest.WORKFLOW_COLUMN_CHOICES
                    ],
                }
            )

        except Exception as e:
            logger.error(f"Error getting workflow board state: {e}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def move_card(self, request, pk=None):
        try:
            service_request = ServiceRequest.objects.get(pk=pk)
            new_status = request.data.get("status")

            if new_status not in dict(ServiceRequest.STATUS_CHOICES):
                return Response(
                    {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST
                )

            service_request.status = new_status
            service_request.save()

            # Send real-time update for workflow
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "workflow",
                {
                    "type": "card_position_update",
                    "card_id": service_request.id,
                    "new_status": new_status,
                },
            )

            return Response(ServiceRequestSerializer(service_request).data)
        except ServiceRequest.DoesNotExist:
            return Response(
                {"error": "Service request not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"])
    def comments(self, request, pk=None):
        """Add a comment to a service request"""
        try:
            service_request = ServiceRequest.objects.get(pk=pk)
            text = request.data.get("text")

            if not text:
                return Response(
                    {"error": "Comment text is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            comment = Comment.objects.create(
                service_request=service_request, user=request.user, text=text
            )

            serializer = CommentSerializer(comment)
            return Response(serializer.data)

        except ServiceRequest.DoesNotExist:
            return Response(
                {"error": "Service request not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["delete"])
    def delete_comment(self, request, pk=None, comment_pk=None):
        """Delete a comment"""
        try:
            comment = Comment.objects.get(pk=comment_pk, service_request_id=pk)

            # Only allow comment deletion by the comment author or staff
            if comment.user != request.user and not request.user.is_staff:
                return Response(
                    {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
                )

            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Comment.DoesNotExist:
            return Response(
                {"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"])
    def labels(self, request, pk=None):
        """Add a label to a service request"""
        try:
            service_request = ServiceRequest.objects.get(pk=pk)
            label_name = request.data.get("label")

            if not label_name:
                return Response(
                    {"error": "Label name is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            label, created = Label.objects.get_or_create(
                service_request=service_request, name=label_name
            )

            serializer = LabelSerializer(label)
            return Response(serializer.data)

        except ServiceRequest.DoesNotExist:
            return Response(
                {"error": "Service request not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["delete"])
    def delete_label(self, request, pk=None, label_name=None):
        """Delete a label"""
        try:
            label = Label.objects.get(service_request_id=pk, name=label_name)
            label.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Label.DoesNotExist:
            return Response(
                {"error": "Label not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
