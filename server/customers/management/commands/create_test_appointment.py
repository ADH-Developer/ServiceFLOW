import random
from datetime import date, time, timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from customers.models import CustomerProfile, ServiceItem, ServiceRequest, Vehicle
from customers.serializers import ServiceRequestSerializer
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates test appointments for development and testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--status",
            type=str,
            default="pending",
            choices=["pending", "confirmed", "in_progress"],
            help="Status of the appointment",
        )
        parser.add_argument(
            "--date",
            type=str,
            choices=["today", "tomorrow"],
            default="today",
            help="Date for the appointment",
        )

    def send_appointment_update(self, appointment):
        """Send WebSocket update for the new appointment"""
        try:
            channel_layer = get_channel_layer()
            serializer = ServiceRequestSerializer(appointment)
            appointment_data = serializer.data

            # Send update to appointments group
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_update",
                    "action": "create",
                    "appointment": appointment_data,
                },
            )

            # Also send workflow board update
            from customers.cache import WorkflowCache

            board_state = WorkflowCache.get_board_state()
            async_to_sync(channel_layer.group_send)(
                "workflow",
                {
                    "type": "workflow_update",
                    "data": board_state,
                },
            )

            self.stdout.write(
                self.style.SUCCESS("Sent WebSocket update for new appointment")
            )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error sending WebSocket update: {e}"))

    def handle(self, *args, **options):
        try:
            # Get or create test user
            username = f"testuser_{random.randint(1000, 9999)}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "first_name": "Test",
                    "last_name": "User",
                },
            )
            if created:
                user.set_password("testpass123")
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created new user: {username}"))

            # Create customer profile
            customer, created = CustomerProfile.objects.get_or_create(
                user=user,
                defaults={"phone": "1234567890", "preferred_contact": "email"},
            )
            if created:
                self.stdout.write(self.style.SUCCESS("Created customer profile"))

            # Create vehicle
            vehicle = Vehicle.objects.create(make="Toyota", model="Camry", year=2020)
            self.stdout.write(self.style.SUCCESS("Created vehicle"))

            # Determine appointment date
            if options["date"] == "today":
                appointment_date = date.today()
            else:
                appointment_date = date.today() + timedelta(days=1)

            # Create random time between 9 AM and 2 PM
            hour = random.randint(9, 13)  # 9 AM to 1 PM
            minute = random.choice([0, 15, 30, 45])
            if hour == 13:  # If it's 1 PM, only allow minutes up to 45
                minute = random.choice([0, 15, 30, 45])
            appointment_time = time(hour, minute)

            # Create appointment
            appointment = ServiceRequest.objects.create(
                customer=customer,
                vehicle=vehicle,
                status=options["status"],
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                workflow_column="estimates",
                workflow_position=0,
            )

            # Create service item
            service_types = [
                "Oil Change",
                "Brake Check",
                "Tire Rotation",
                "General Inspection",
            ]
            urgency_levels = ["low", "medium", "high"]

            ServiceItem.objects.create(
                service_request=appointment,
                service_type=random.choice(service_types),
                description="Test service description",
                urgency=random.choice(urgency_levels),
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Created appointment for {appointment.appointment_time}"
                )
            )

            # Send WebSocket update
            self.send_appointment_update(appointment)

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error creating test appointment: {str(e)}")
            )
