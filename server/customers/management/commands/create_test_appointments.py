from datetime import date, time

from customers.models import CustomerProfile, ServiceItem, ServiceRequest, Vehicle
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates test appointments for today"

    def handle(self, *args, **kwargs):
        try:
            # Create test user if not exists
            user, created = User.objects.get_or_create(
                username="testuser",
                defaults={
                    "email": "test@example.com",
                    "first_name": "Test",
                    "last_name": "User",
                },
            )
            if created:
                user.set_password("testpass123")
                user.save()
                self.stdout.write(self.style.SUCCESS("Created test user"))

            # Create customer profile if not exists
            customer, created = CustomerProfile.objects.get_or_create(
                user=user,
                defaults={"phone": "1234567890", "preferred_contact": "email"},
            )
            if created:
                self.stdout.write(self.style.SUCCESS("Created customer profile"))

            # Create vehicle if not exists
            vehicle, created = Vehicle.objects.get_or_create(
                make="Toyota", model="Camry", year=2020
            )
            if created:
                self.stdout.write(self.style.SUCCESS("Created vehicle"))

            # Create appointments for today
            today = date.today()

            # Create a pending appointment for 10:30 AM
            pending_appointment = ServiceRequest.objects.create(
                customer=customer,
                vehicle=vehicle,
                status="pending",
                appointment_date=today,
                appointment_time=time(10, 30),
            )
            ServiceItem.objects.create(
                service_request=pending_appointment,
                service_type="Oil Change",
                description="Regular oil change service",
                urgency="low",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created pending appointment for {pending_appointment.appointment_time}"
                )
            )

            # Create a confirmed appointment for 2:30 PM
            confirmed_appointment = ServiceRequest.objects.create(
                customer=customer,
                vehicle=vehicle,
                status="confirmed",
                appointment_date=today,
                appointment_time=time(14, 30),
            )
            ServiceItem.objects.create(
                service_request=confirmed_appointment,
                service_type="Brake Service",
                description="Brake pad replacement",
                urgency="medium",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created confirmed appointment for {confirmed_appointment.appointment_time}"
                )
            )

            # Create an in-progress appointment for 9:00 AM
            in_progress_appointment = ServiceRequest.objects.create(
                customer=customer,
                vehicle=vehicle,
                status="in_progress",
                appointment_date=today,
                appointment_time=time(9, 0),
            )
            ServiceItem.objects.create(
                service_request=in_progress_appointment,
                service_type="Tire Rotation",
                description="Rotate and balance all tires",
                urgency="low",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created in-progress appointment for {in_progress_appointment.appointment_time}"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error creating test appointments: {str(e)}")
            )
