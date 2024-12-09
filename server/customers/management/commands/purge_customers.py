from customers.models import CustomerProfile
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()  # This will get the correct custom User model


class Command(BaseCommand):
    help = "Purges all customer accounts while preserving superusers"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry-run", False)

        # Count records before deletion
        customer_count = CustomerProfile.objects.count()
        user_count = User.objects.filter(is_superuser=False).count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Would delete {customer_count} customer profiles and {user_count} user accounts"
                )
            )
            return

        try:
            # Delete all customer profiles first (due to foreign key constraints)
            CustomerProfile.objects.all().delete()

            # Delete all non-superuser accounts
            User.objects.filter(is_superuser=False).delete()

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully purged {customer_count} customer profiles and {user_count} user accounts"
                )
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during purge: {str(e)}"))
