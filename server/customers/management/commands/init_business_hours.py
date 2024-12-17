from datetime import time

from customers.models import BusinessHours
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Initialize default business hours"

    def handle(self, *args, **kwargs):
        # Default business hours
        default_hours = [
            # Monday-Friday: 8 AM - 6 PM
            {
                "day": 0,
                "is_open": True,
                "start": "08:00",
                "end": "18:00",
                "after_hours": True,
            },  # Monday
            {
                "day": 1,
                "is_open": True,
                "start": "08:00",
                "end": "18:00",
                "after_hours": True,
            },  # Tuesday
            {
                "day": 2,
                "is_open": True,
                "start": "08:00",
                "end": "18:00",
                "after_hours": True,
            },  # Wednesday
            {
                "day": 3,
                "is_open": True,
                "start": "08:00",
                "end": "18:00",
                "after_hours": True,
            },  # Thursday
            {
                "day": 4,
                "is_open": True,
                "start": "08:00",
                "end": "18:00",
                "after_hours": True,
            },  # Friday
            # Saturday: 9 AM - 2 PM
            {
                "day": 5,
                "is_open": True,
                "start": "09:00",
                "end": "14:00",
                "after_hours": False,
            },  # Saturday
            # Sunday: Closed
            {
                "day": 6,
                "is_open": False,
                "start": None,
                "end": None,
                "after_hours": False,
            },  # Sunday
        ]

        for hours in default_hours:
            business_hours, created = BusinessHours.objects.get_or_create(
                day_of_week=hours["day"],
                defaults={
                    "is_open": hours["is_open"],
                    "start_time": (
                        time.fromisoformat(hours["start"]) if hours["start"] else None
                    ),
                    "end_time": (
                        time.fromisoformat(hours["end"]) if hours["end"] else None
                    ),
                    "allow_after_hours_dropoff": hours["after_hours"],
                },
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created business hours for {dict(BusinessHours.DAYS_OF_WEEK)[hours["day"]]}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Business hours already exist for {dict(BusinessHours.DAYS_OF_WEEK)[hours["day"]]}'
                    )
                )
