from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Sets up super admin with all roles"

    def handle(self, *args, **kwargs):
        # Create super admin if doesn't exist
        if not User.objects.filter(username="admin").exists():
            user = User.objects.create_superuser(
                username="admin", email="admin@example.com", password="admin"
            )
            self.stdout.write(self.style.SUCCESS("Created super admin user"))
        else:
            user = User.objects.get(username="admin")

        # Assign all roles to super admin
        roles = ["super_admin", "service_advisor", "technician", "parts_advisor"]
        for role in roles:
            group, _ = Group.objects.get_or_create(name=role)
            user.groups.add(group)

        self.stdout.write(self.style.SUCCESS("Assigned all roles to super admin"))
