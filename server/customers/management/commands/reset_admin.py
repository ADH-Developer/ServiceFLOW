from customers.models import CustomerProfile
from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Reset or create admin user with email admin@admin.com"

    def handle(self, *args, **options):
        # Try to find existing admin user
        admin_user = User.objects.filter(email="admin@admin.com").first()

        if admin_user:
            self.stdout.write("Found existing admin user, resetting password...")
            admin_user.set_password("admin")
            admin_user.save()
        else:
            self.stdout.write("Creating new admin user...")
            admin_user = User.objects.create_superuser(
                username="admin",
                email="admin@admin.com",
                password="admin",
                first_name="Admin",
                last_name="User",
            )

            # Create customer profile for admin
            CustomerProfile.objects.create(
                user=admin_user, phone="1234567890", preferred_contact="email"
            )

        # Ensure admin is in staff group
        staff_group, _ = Group.objects.get_or_create(name="Staff")
        admin_user.groups.add(staff_group)

        self.stdout.write(
            self.style.SUCCESS(
                f"""
Admin user has been reset/created with the following credentials:
Email: admin@admin.com
Password: admin
"""
            )
        )
