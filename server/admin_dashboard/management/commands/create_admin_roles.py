from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates default admin roles"

    def handle(self, *args, **kwargs):
        roles = ["super_admin", "service_advisor", "technician", "parts_advisor"]

        for role in roles:
            Group.objects.get_or_create(name=role)
            self.stdout.write(self.style.SUCCESS(f"Created role: {role}"))
