import json
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

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

    WORKFLOW_COLUMN_CHOICES = [
        ("estimates", "Estimates"),
        ("in_progress", "In Progress"),
        ("waiting_parts", "Waiting on Parts"),
        ("completed", "Completed"),
    ]

    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    workflow_column = models.CharField(
        max_length=20,
        choices=WORKFLOW_COLUMN_CHOICES,
        default="estimates",
        db_index=True,
    )
    workflow_position = models.IntegerField(
        default=0,
        db_index=True,
    )
    workflow_history = models.JSONField(default=list, blank=True)
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    after_hours_dropoff = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["workflow_column", "workflow_position"]),
        ]
        ordering = ["workflow_column", "workflow_position"]

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

    async def update_cache_and_notify(self):
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
                ServiceRequest.objects.filter(appointment_date=today)
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
                await channel_layer.group_send(
                    "appointments",
                    {
                        "type": "appointments.pending_count_updated",
                        "data": {"count": pending_count},
                    },
                )

                # Send today's appointments update
                await channel_layer.group_send(
                    "appointments",
                    {
                        "type": "appointments.today_appointments_updated",
                        "data": appointments_data,
                    },
                )
                logger.info("Sent today's appointments update")
            except Exception as e:
                logger.error(f"Error sending WebSocket notification: {e}")

            return pending_count
        except Exception as e:
            logger.error(f"Error in update_cache_and_notify: {e}")
            return None

    def validate_workflow_transition(self, old_column, new_column):
        """Validate workflow column transitions"""
        if old_column == "completed" and new_column != "completed":
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "Items in the completed column cannot be moved back to other columns. "
                "This is to maintain the integrity of the workflow history."
            )

    @classmethod
    def reset_workflow_positions(cls):
        """Reset and reorder all card positions within their columns"""
        from django.db import transaction

        with transaction.atomic():
            for column, _ in cls.WORKFLOW_COLUMN_CHOICES:
                cards = cls.objects.filter(workflow_column=column).order_by(
                    "created_at"
                )
                for index, card in enumerate(cards):
                    if card.workflow_position != index:
                        card.workflow_position = index
                        card.save(update_fields=["workflow_position"])

    def save(self, *args, skip_ws_update=False, **kwargs):
        # Check if this is a new instance
        is_new = self._state.adding

        # If new instance, set position to end of column
        if is_new:
            max_position = ServiceRequest.objects.filter(
                workflow_column=self.workflow_column
            ).aggregate(models.Max("workflow_position"))["workflow_position__max"]

            self.workflow_position = (
                (max_position + 1) if max_position is not None else 0
            )

        # Check if this is a new instance
        is_new = self._state.adding

        # If new instance, check auto-confirm setting
        if is_new:
            settings = SystemSettings.get_settings()
            if settings.auto_confirm_appointments:
                self.status = "confirmed"
                self.workflow_column = "estimates"

        # Check if workflow column is changing
        if self.pk:
            try:
                old_instance = ServiceRequest.objects.get(pk=self.pk)
                if old_instance.workflow_column != self.workflow_column:
                    # Validate workflow transitions
                    self.validate_workflow_transition(
                        old_instance.workflow_column, self.workflow_column
                    )

                    # Add to history
                    if not isinstance(self.workflow_history, list):
                        self.workflow_history = []

                    self.workflow_history.append(
                        {
                            "from_column": old_instance.workflow_column,
                            "to_column": self.workflow_column,
                            "timestamp": timezone.now().isoformat(),
                        }
                    )

                    # Auto-update status based on workflow column
                    if self.workflow_column == "completed":
                        self.status = "completed"
                    elif self.workflow_column == "in_progress":
                        self.status = "in_progress"
                    elif self.workflow_column == "waiting_parts":
                        self.status = "in_progress"
                    elif self.workflow_column == "estimates":
                        self.status = "confirmed"

            except ServiceRequest.DoesNotExist:
                pass  # New instance

        # Save the instance
        super().save(*args, **kwargs)

        # Send WebSocket update if it's a today's appointment and update hasn't been skipped
        try:
            if (
                not skip_ws_update
                and self.appointment_date == timezone.localtime().date()
            ):
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer

                from .serializers import ServiceRequestSerializer

                channel_layer = get_channel_layer()
                serializer = ServiceRequestSerializer(self)
                appointment_data = serializer.data

                # Send update to appointments group
                async_to_sync(channel_layer.group_send)(
                    "appointments",
                    {
                        "type": "appointment_update",
                        "action": "create" if is_new else "update",
                        "appointment": appointment_data,
                    },
                )
        except Exception as e:
            logger.error(f"Error sending WebSocket update: {e}")

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


class Comment(models.Model):
    service_request = models.ForeignKey(
        "ServiceRequest", on_delete=models.CASCADE, related_name="comments"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.user} on {self.service_request}"


class Label(models.Model):
    service_request = models.ForeignKey(
        "ServiceRequest", on_delete=models.CASCADE, related_name="labels"
    )
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["service_request", "name"]
        ordering = ["name"]

    def __str__(self):
        return self.name


class SystemSettings(models.Model):
    auto_confirm_appointments = models.BooleanField(
        default=False,
        help_text="If enabled, new appointments will be automatically confirmed instead of pending",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def save(self, *args, **kwargs):
        if self.auto_confirm_appointments:
            # Get count of pending appointments
            pending_count = ServiceRequest.objects.filter(status="pending").count()

            if pending_count > 0:
                # Update all pending appointments to confirmed
                ServiceRequest.objects.filter(status="pending").update(
                    status="confirmed", workflow_column="estimates"
                )

                # Update cache
                try:
                    # Update pending count in cache
                    cache.set("pending_appointments_count", 0, 300)
                    logger.info(f"Auto-confirmed {pending_count} pending appointments")
                except Exception as e:
                    logger.error(f"Error updating cache after auto-confirmation: {e}")

        # Ensure only one instance exists
        self.__class__.objects.exclude(id=self.id).delete()
        super().save(*args, **kwargs)

        # After saving, trigger async notification if needed
        if self.auto_confirm_appointments and pending_count > 0:
            from asgiref.sync import async_to_sync

            try:
                async_to_sync(self.notify_auto_confirm)(pending_count)
            except Exception as e:
                logger.error(f"Error sending auto-confirm notification: {e}")

    async def notify_auto_confirm(self, pending_count):
        """Send notifications about auto-confirmed appointments"""
        try:
            await channel_layer.group_send(
                "appointments",
                {"type": "appointments.pending_count_updated", "data": {"count": 0}},
            )
            logger.info(
                f"Sent notification for {pending_count} auto-confirmed appointments"
            )
        except Exception as e:
            logger.error(f"Error sending auto-confirm notification: {e}")

    @classmethod
    def get_settings(cls):
        """Get or create system settings"""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
