from django.conf import settings
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates default groups and permissions"

    def handle(self, *args, **options):
        for group_name, group_data in settings.GROUPS.items():
            group, created = Group.objects.get_or_create(name=group_name)

            if created:
                self.stdout.write(f"Created group: {group_name}")

            # Add permissions to group
            for permission_name in group_data["permissions"]:
                try:
                    perm = Permission.objects.get(codename=permission_name)
                    group.permissions.add(perm)
                except Permission.DoesNotExist:
                    self.stdout.write(f"Permission not found: {permission_name}")

        self.stdout.write(
            self.style.SUCCESS("Successfully set up groups and permissions")
        )
