import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

PENDING_COUNT_KEY = "pending_appointments_count"
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
    def update_pending_count():
        """Update pending appointments count in cache"""
        try:
            from customers.models import ServiceRequest

            count = ServiceRequest.objects.filter(status="pending").count()
            cache.set(PENDING_COUNT_KEY, count, AppointmentCache.get_cache_ttl())
            return count
        except Exception as e:
            logger.error(f"Error updating pending count in cache: {e}")
            return None

    @staticmethod
    def invalidate_pending_count():
        """Invalidate pending appointments count cache"""
        try:
            cache.delete(PENDING_COUNT_KEY)
        except Exception as e:
            logger.error(f"Error invalidating pending count cache: {e}")

    @staticmethod
    def warm_cache():
        """Warm up the cache with initial data"""
        try:
            AppointmentCache.update_pending_count()
            logger.info("Cache warmed up successfully")
        except Exception as e:
            logger.error(f"Error warming up cache: {e}")
