import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

PENDING_COUNT_KEY = "pending_appointments_count"
TODAY_APPOINTMENTS_KEY = "today_appointments"
DEFAULT_TTL = 60 * 5  # 5 minutes default


class AppointmentCache:
    @staticmethod
    def get_cache_ttl():
        from django.conf import settings

        return getattr(settings, "CACHE_TTL", DEFAULT_TTL)

    @staticmethod
    def get_pending_count():
        """Get pending appointments count from cache"""
        try:
            count = cache.get(PENDING_COUNT_KEY)
            if count is None:
                from customers.models import ServiceRequest

                count = ServiceRequest.objects.filter(status="pending").count()
                cache.set(PENDING_COUNT_KEY, count, AppointmentCache.get_cache_ttl())
            return count
        except Exception as e:
            logger.error(f"Error getting pending count from cache: {e}")
            return None

    @staticmethod
    def get_today_appointments():
        """Get today's appointments from cache"""
        try:
            appointments = cache.get(TODAY_APPOINTMENTS_KEY)
            if appointments is None:
                from datetime import date

                from customers.models import ServiceRequest
                from customers.serializers import ServiceRequestSerializer

                today = date.today()
                appointments_queryset = (
                    ServiceRequest.objects.filter(appointment_date=today)
                    .select_related("customer__user", "vehicle")
                    .prefetch_related("services")
                    .order_by("appointment_time")
                )
                serializer = ServiceRequestSerializer(appointments_queryset, many=True)
                appointments = serializer.data
                cache.set(
                    TODAY_APPOINTMENTS_KEY,
                    appointments,
                    AppointmentCache.get_cache_ttl(),
                )
            return appointments
        except Exception as e:
            logger.error(f"Error getting today's appointments from cache: {e}")
            return None

    @staticmethod
    def update_cache():
        """Update both caches"""
        try:
            from datetime import date

            from customers.models import ServiceRequest
            from customers.serializers import ServiceRequestSerializer

            # Update pending count
            count = ServiceRequest.objects.filter(status="pending").count()
            cache.set(PENDING_COUNT_KEY, count, AppointmentCache.get_cache_ttl())

            # Update today's appointments
            today = date.today()
            appointments_queryset = (
                ServiceRequest.objects.filter(appointment_date=today)
                .select_related("customer__user", "vehicle")
                .prefetch_related("services")
                .order_by("appointment_time")
            )
            serializer = ServiceRequestSerializer(appointments_queryset, many=True)
            appointments = serializer.data
            cache.set(
                TODAY_APPOINTMENTS_KEY, appointments, AppointmentCache.get_cache_ttl()
            )

            return count, appointments
        except Exception as e:
            logger.error(f"Error updating cache: {e}")
            return None, None

    @staticmethod
    def invalidate_cache():
        """Invalidate both caches"""
        try:
            cache.delete(PENDING_COUNT_KEY)
            cache.delete(TODAY_APPOINTMENTS_KEY)
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
