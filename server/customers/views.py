import asyncio
import zoneinfo
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import models, transaction
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .cache import AppointmentCache
from .models import (
    BusinessHours,
    CustomerProfile,
    ServiceItem,
    ServiceRequest,
    SystemSettings,
    Vehicle,
)
from .permissions import IsStaffOrOwner
from .serializers import (
    CustomerProfileSerializer,
    ServiceItemSerializer,
    ServiceRequestSerializer,
    VehicleSerializer,
)
from .socket_io import get_dashboard_schedule, socket_manager


@api_view(["POST"])
@permission_classes([AllowAny])
def register_customer(request):
    """Register a new customer"""
    try:
        serializer = CustomerProfileSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()
            return Response(
                {
                    "message": "Registration successful",
                    "data": CustomerProfileSerializer(profile).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"message": "Registration failed", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {"message": "Registration failed", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login_customer(request):
    """Login a customer or staff member"""
    try:
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"message": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )

        # If user is staff, return staff data
        if user.is_staff:
            from rest_framework_simplejwt.tokens import RefreshToken

            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "message": "Login successful",
                    "data": {
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "is_staff": user.is_staff,
                        },
                        "token": {
                            "access": str(refresh.access_token),
                            "refresh": str(refresh),
                        },
                    },
                },
                status=status.HTTP_200_OK,
            )

        # For non-staff users, check customer profile
        try:
            profile = user.customerprofile
            serializer = CustomerProfileSerializer(profile)
            return Response(
                {"message": "Login successful", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        except CustomerProfile.DoesNotExist:
            return Response(
                {"message": "Customer profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    except Exception as e:
        return Response(
            {"message": "Login failed", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class ServiceRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing service requests.
    """

    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAuthenticated, IsStaffOrOwner]

    def get_queryset(self):
        """
        Filter queryset based on user role and query parameters.
        Staff can see all requests, customers can only see their own.
        """
        queryset = ServiceRequest.objects.select_related(
            "customer__user", "vehicle"
        ).prefetch_related("services")

        if not self.request.user.is_staff:
            queryset = queryset.filter(customer__user=self.request.user)

        # Filter by status if provided
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by date if provided
        date_param = self.request.query_params.get("date")
        if date_param:
            try:
                target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
                queryset = queryset.filter(appointment_date=target_date)
            except ValueError:
                raise ValidationError("Invalid date format. Use YYYY-MM-DD")

        return queryset.order_by("-created_at")

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Get today's appointments"""
        try:
            from datetime import date

            today = date.today()
            appointments = (
                ServiceRequest.objects.filter(appointment_date=today)
                .select_related("customer__user", "vehicle")
                .prefetch_related("services")
                .order_by("appointment_time")
            )
            serializer = ServiceRequestSerializer(appointments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving today's appointments: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def validate_appointment_time(self, date_str, time_str):
        """Validate that the appointment time is valid and available"""
        try:
            # Parse the incoming time (24-hour format HH:mm)
            hour, minute = map(int, time_str.split(":"))

            # Get shop's timezone (EST)
            shop_tz = zoneinfo.ZoneInfo("America/New_York")

            # Get current time in shop's timezone
            now = timezone.now().astimezone(shop_tz)

            # Create appointment datetime in shop's timezone
            appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()

            # Explicitly check if this is a future date
            is_future_date = appointment_date > now.date()

            # Create the full appointment datetime
            appointment_datetime = datetime.combine(
                appointment_date, datetime.strptime(time_str, "%H:%M").time()
            )
            appointment_datetime = timezone.make_aware(appointment_datetime, shop_tz)

            # Only apply 10-minute buffer for same-day appointments
            if not is_future_date:
                min_appointment_time = now + timedelta(minutes=10)
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
                        f'{business_hours.start_time.strftime("%I:%M %p")} - '
                        f'{business_hours.end_time.strftime("%I:%M %p")}'
                    )

            # 10-minute interval check
            if appointment_datetime.minute % 10 != 0:
                raise ValidationError(
                    "Appointments must be scheduled in 10-minute intervals"
                )

            return appointment_datetime

        except ValueError as e:
            raise ValidationError(f"Invalid date or time format: {str(e)}")
        except Exception as e:
            raise ValidationError(str(e))

    def perform_create(self, serializer):
        """Create a new service request"""
        try:
            # Get or create customer profile
            customer, _ = CustomerProfile.objects.get_or_create(user=self.request.user)

            # Get or create vehicle
            vehicle_data = self.request.data.get("vehicle", {})
            if not vehicle_data:
                raise ValidationError("Vehicle information is required")

            vehicle, _ = Vehicle.objects.get_or_create(
                make=vehicle_data.get("make"),
                model=vehicle_data.get("model"),
                year=vehicle_data.get("year"),
            )

            # Validate appointment time
            appointment_date = self.request.data.get("appointment_date")
            appointment_time = self.request.data.get("appointment_time")
            if not appointment_date or not appointment_time:
                raise ValidationError("Appointment date and time are required")

            self.validate_appointment_time(appointment_date, appointment_time)

            # Create service request
            service_request = serializer.save(
                customer=customer,
                vehicle=vehicle,
                status="pending",
            )

            # Create service items
            services_data = self.request.data.get("services", [])
            for service_data in services_data:
                ServiceItem.objects.create(
                    service_request=service_request,
                    service_type=service_data.get("service_type"),
                    description=service_data.get("description", ""),
                    urgency=service_data.get("urgency", "low"),
                )

            # Update cache and send notifications
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(service_request.update_cache_and_notify())
            loop.close()

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(f"Error creating service request: {str(e)}")

    @action(detail=False, methods=["get"])
    def available_slots(self, request):
        """
        Get available appointment slots for a given date
        """
        try:
            # Get requested date
            date_param = request.query_params.get("date")
            if not date_param:
                raise ValidationError("Date parameter is required")

            try:
                requested_date = datetime.strptime(date_param, "%Y-%m-%d").date()
            except ValueError:
                raise ValidationError("Invalid date format. Use YYYY-MM-DD")

            # Get shop's timezone
            shop_tz = zoneinfo.ZoneInfo("America/New_York")

            # Get current time in shop's timezone
            current_datetime = timezone.now().astimezone(shop_tz)

            # Check if requested date is in the past
            if requested_date < current_datetime.date():
                raise ValidationError("Cannot schedule appointments for past dates")

            # Check if requested date is more than 30 days in the future
            max_future_date = current_datetime.date() + timedelta(days=30)
            if requested_date > max_future_date:
                raise ValidationError(
                    "Cannot schedule appointments more than 30 days in advance"
                )

            # Check if it's the next day
            is_next_day = requested_date > current_datetime.date()

            # Get business hours for the requested date
            business_hours = BusinessHours.objects.get(
                day_of_week=requested_date.weekday()
            )

            if not business_hours.is_open:
                return Response(
                    {"message": "Business is closed on this day", "slots": []},
                    status=status.HTTP_200_OK,
                )

            time_slots = []

            if business_hours.start_time and business_hours.end_time:
                # Create time slots at 10-minute intervals
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

            return Response(
                {
                    "message": "Available time slots retrieved successfully",
                    "slots": time_slots,
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving available slots: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WorkflowViewSet(viewsets.ViewSet):
    """
    ViewSet for managing workflow operations.
    """

    permission_classes = [IsAuthenticated, IsStaffOrOwner]

    @action(detail=False, methods=["get"])
    def columns(self, request):
        """Get workflow columns with their service requests"""
        try:
            workflow_data = {}
            for column, _ in ServiceRequest.WORKFLOW_COLUMN_CHOICES:
                requests = (
                    ServiceRequest.objects.filter(workflow_column=column)
                    .select_related("customer__user", "vehicle")
                    .prefetch_related("services", "comments", "labels")
                    .order_by("workflow_position")
                )

                serializer = ServiceRequestSerializer(requests, many=True)
                workflow_data[column] = serializer.data

            return Response(workflow_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving workflow data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        """Move a service request to a different workflow column"""
        try:
            service_request = get_object_or_404(ServiceRequest, pk=pk)
            new_column = request.data.get("column")
            new_position = request.data.get("position", 0)

            if not new_column:
                raise ValidationError("New column is required")

            if new_column not in dict(ServiceRequest.WORKFLOW_COLUMN_CHOICES):
                raise ValidationError("Invalid workflow column")

            with transaction.atomic():
                # Update positions of other items in the target column
                ServiceRequest.objects.filter(
                    workflow_column=new_column, workflow_position__gte=new_position
                ).update(workflow_position=models.F("workflow_position") + 1)

                # Move the service request
                service_request.workflow_column = new_column
                service_request.workflow_position = new_position
                service_request.save()

            serializer = ServiceRequestSerializer(service_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error moving service request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
