import logging
import os

from django.apps import AppConfig
from django.core.cache import cache

logger = logging.getLogger(__name__)


class CustomersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customers"
    path = os.path.dirname(os.path.abspath(__file__))

    def ready(self):
        """Warm up cache when Django starts"""
        try:
            # Import here to avoid circular import
            from datetime import date

            from .models import ServiceRequest
            from .serializers import ServiceRequestSerializer

            # Get initial pending count
            count = ServiceRequest.objects.filter(status="pending").count()
            cache.set("pending_appointments_count", count, 300)

            # Get initial today's appointments
            today = date.today()
            today_appointments = (
                ServiceRequest.objects.filter(appointment_date=today)
                .select_related("customer__user", "vehicle")
                .prefetch_related("services")
                .order_by("appointment_time")
            )
            serializer = ServiceRequestSerializer(today_appointments, many=True)
            appointments_data = serializer.data
            cache.set("today_appointments", appointments_data, 300)

            logger.info("Appointment cache warmed up on startup")
        except Exception as e:
            logger.error(f"Error warming appointment cache on startup: {e}")
