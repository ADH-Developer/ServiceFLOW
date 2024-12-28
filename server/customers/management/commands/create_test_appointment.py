import asyncio
import random
from datetime import date, time, timedelta

from asgiref.sync import sync_to_async
from customers.models import CustomerProfile, ServiceItem, ServiceRequest, Vehicle
from customers.serializers import ServiceRequestSerializer
from customers.socket_io import (
    get_pending_count,
    get_today_appointments,
    socket_manager,
)
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

    async def emit_socket_events(self, appointment):
        """Emit socket events for the new appointment"""
        try:
            # Emit appointment_created event
            serializer = ServiceRequestSerializer(appointment)
            appointment_data = await sync_to_async(lambda: serializer.data)()
            await socket_manager.emit_to_namespace(
                "appointments",
                "appointment_created",
                appointment_data,
            )

            # Update pending count
            pending_count = await get_pending_count()
            await socket_manager.emit_to_namespace(
                "appointments",
                "pending_count_updated",
                {"count": pending_count},
            )

            # Update today's appointments if the appointment is for today
            if appointment.appointment_date == date.today():
                today_appointments = await get_today_appointments()
                await socket_manager.emit_to_namespace(
                    "appointments",
                    "today_appointments_updated",
                    today_appointments,
                )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error emitting socket events: {e}"))

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

            # Create service request
            appointment = ServiceRequest.objects.create(
                customer=customer,
                vehicle=vehicle,
                status=options["status"],
                appointment_date=appointment_date,
                appointment_time=appointment_time,
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
                    f'Successfully created {options["status"]} appointment for '
                    f'{appointment_date} at {appointment_time.strftime("%I:%M %p")}'
                )
            )

            # Emit socket events
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.emit_socket_events(appointment))
            loop.close()

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error creating test appointment: {str(e)}")
            )
