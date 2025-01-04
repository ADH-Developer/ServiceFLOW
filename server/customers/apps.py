import threading

from django.apps import AppConfig
from django.db.models.signals import post_migrate


def warm_appointment_cache(sender, **kwargs):
    """Warm the appointment cache after migrations"""
    from customers.cache import AppointmentCache

    def _warm_cache():
        try:
            AppointmentCache.update_cache()
        except Exception as e:
            print(f"Error warming appointment cache: {e}")

    # Run in a separate thread
    thread = threading.Thread(target=_warm_cache)
    thread.start()


class CustomersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customers"

    def ready(self):
        post_migrate.connect(warm_appointment_cache, sender=self)
