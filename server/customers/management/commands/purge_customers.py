from customers.models import CustomerProfile
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Purges all customer accounts while preserving superusers"

    def handle(self, *args, **kwargs):
        # Delete all customer profiles
        customer_count = CustomerProfile.objects.count()
        CustomerProfile.objects.all().delete()

        # Delete all non-superuser accounts
        user_count = User.objects.filter(is_superuser=False).count()
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully purged {customer_count} customer profiles and {user_count} user accounts"
            )
        )
