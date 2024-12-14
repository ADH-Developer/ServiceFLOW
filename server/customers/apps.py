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
            from .models import ServiceRequest

            # Get initial count
            count = ServiceRequest.objects.filter(status="pending").count()
            # Cache for 5 minutes
            cache.set("pending_appointments_count", count, 300)

            logger.info("Appointment cache warmed up on startup")
        except Exception as e:
            logger.error(f"Error warming appointment cache on startup: {e}")
