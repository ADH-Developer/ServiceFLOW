import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import models

from .cache import AppointmentCache

logger = logging.getLogger(__name__)


class Vehicle(models.Model):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    vin = models.CharField(max_length=17, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.year} {self.make} {self.model}"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20)
    preferred_contact = models.CharField(
        max_length=10, choices=[("email", "Email"), ("phone", "Phone")], default="email"
    )
    vehicles = models.ManyToManyField(Vehicle)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

    def save(self, *args, **kwargs):
        # Ensure user is in customer group
        customer_group, _ = Group.objects.get_or_create(name="Customer")
        self.user.groups.add(customer_group)
        super().save(*args, **kwargs)


class ServiceItem(models.Model):
    service_request = models.ForeignKey(
        "ServiceRequest", on_delete=models.CASCADE, related_name="services"
    )
    service_type = models.CharField(max_length=100)
    description = models.TextField()
    urgency = models.CharField(
        max_length=20, choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")]
    )

    def __str__(self):
        return f"{self.service_type} - {self.urgency}"


class ServiceRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    after_hours_dropoff = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.customer} - {self.appointment_date} {self.appointment_time}"

    def clean(self):
        if self.appointment_date and self.appointment_time:
            from datetime import datetime

            appointment_datetime = datetime.combine(
                self.appointment_date, self.appointment_time
            )

            within_hours, allows_after_hours = (
                BusinessHours.is_time_within_business_hours(appointment_datetime)
            )

            if not within_hours and not (
                allows_after_hours and self.after_hours_dropoff
            ):
                business_hours = BusinessHours.objects.get(
                    day_of_week=appointment_datetime.weekday()
                )
                if not business_hours.is_open:
                    raise ValidationError(
                        "This day is not available for appointments as the business is closed."
                    )
                elif not allows_after_hours:
                    raise ValidationError(
                        f"Appointments must be scheduled during business hours: "
                        f"{business_hours.start_time.strftime('%I:%M %p')} - "
                        f"{business_hours.end_time.strftime('%I:%M %p')}"
                    )

    def update_cache_and_notify(self):
        try:
            logger.info("Starting update_cache_and_notify")
            # Get new pending count
            pending_count = ServiceRequest.objects.filter(status="pending").count()
            logger.info(f"Got pending count: {pending_count}")

            # Get today's appointments
            from datetime import date

            from .serializers import ServiceRequestSerializer

            today = date.today()
            today_appointments = (
                ServiceRequest.objects.filter(
                    appointment_date=today
                )  # Remove status filter
                .select_related("customer__user", "vehicle")
                .prefetch_related("services")
                .order_by("appointment_time")
            )

            serializer = ServiceRequestSerializer(today_appointments, many=True)
            appointments_data = serializer.data

            # Update cache
            try:
                logger.info("Updating cache...")
                cache.set("pending_appointments_count", pending_count, 300)
                cache.set("today_appointments", appointments_data, 300)
                logger.info("Cache updated successfully")
            except Exception as e:
                logger.error(f"Error updating cache: {e}")

            # Send WebSocket notifications
            try:
                logger.info("Sending WebSocket notifications...")
                channel_layer = get_channel_layer()

                # Send pending count update
                async_to_sync(channel_layer.group_send)(
                    "appointments",
                    {
                        "type": "appointment_update",
                        "message_type": "pending_count",
                        "count": pending_count,
                    },
                )

                # Send today's appointments update
                async_to_sync(channel_layer.group_send)(
                    "appointments",
                    {
                        "type": "appointment_update",
                        "message_type": "today_appointments",
                        "appointments": appointments_data,
                    },
                )
                logger.info("Sent today's appointments update")
            except Exception as e:
                logger.error(f"Error sending WebSocket notification: {e}")

            return pending_count
        except Exception as e:
            logger.error(f"Error in update_cache_and_notify: {e}")
            return None

    def save(self, *args, **kwargs):
        self.clean()  # Run validation before saving

        # Check if status is changing
        if self.pk:
            try:
                old_instance = ServiceRequest.objects.get(pk=self.pk)
                status_changed = old_instance.status != self.status
            except ServiceRequest.DoesNotExist:
                status_changed = True
        else:
            status_changed = True  # New instance

        # Save the instance
        super().save(*args, **kwargs)

        # Update cache if status changed
        if status_changed:
            self.update_cache_and_notify()

    def delete(self, *args, **kwargs):
        # Delete the instance
        super().delete(*args, **kwargs)
        # Update cache and send notification
        self.update_cache_and_notify()


class BusinessHours(models.Model):
    DAYS_OF_WEEK = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK, unique=True)
    is_open = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    allow_after_hours_dropoff = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Business Hours"
        verbose_name_plural = "Business Hours"
        ordering = ["day_of_week"]

    def clean(self):
        if self.is_open:
            if not self.start_time or not self.end_time:
                raise ValidationError(
                    "Start time and end time are required when business is open"
                )
            if self.start_time >= self.end_time:
                raise ValidationError("Start time must be before end time")

    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        if not self.is_open:
            return f"{day_name}: Closed"
        return f"{day_name}: {self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')}"

    @classmethod
    def is_time_within_business_hours(cls, date_time):
        """Check if a given datetime is within business hours"""
        day_of_week = date_time.weekday()
        time = date_time.time()

        try:
            business_hours = cls.objects.get(day_of_week=day_of_week)
            if not business_hours.is_open:
                return False, business_hours.allow_after_hours_dropoff

            within_hours = business_hours.start_time <= time <= business_hours.end_time
            return within_hours, business_hours.allow_after_hours_dropoff
        except cls.DoesNotExist:
            return False, False
