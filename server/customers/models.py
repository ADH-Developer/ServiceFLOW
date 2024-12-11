from django.contrib.auth.models import Group, User
from django.db import models


class Vehicle(models.Model):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    vin = models.CharField(max_length=17, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.year} {self.make} {self.model}"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20)
    preferred_contact = models.CharField(
        max_length=10, choices=[("email", "Email"), ("phone", "Phone")], default="email"
    )
    vehicles = models.ManyToManyField(Vehicle)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

    def save(self, *args, **kwargs):
        # Ensure user is in customer group
        customer_group, _ = Group.objects.get_or_create(name="Customer")
        self.user.groups.add(customer_group)
        super().save(*args, **kwargs)


class ServiceItem(models.Model):
    service_request = models.ForeignKey(
        "ServiceRequest", on_delete=models.CASCADE, related_name="services"
    )
    service_type = models.CharField(max_length=100)
    description = models.TextField()
    urgency = models.CharField(
        max_length=20, choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")]
    )

    def __str__(self):
        return f"{self.service_type} - {self.urgency}"


class ServiceRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customer} - {self.appointment_date} {self.appointment_time}"
