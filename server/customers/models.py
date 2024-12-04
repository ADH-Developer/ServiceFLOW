from django.contrib.auth.models import User
from django.db import models


class Vehicle(models.Model):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    vin = models.CharField(max_length=17, unique=True)

    def __str__(self):
        return f"{self.year} {self.make} {self.model}"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20)
    preferred_contact = models.CharField(
        max_length=10,
        choices=[("email", "Email"), ("phone", "Phone"), ("both", "Both")],
        default="phone",
    )
    vehicles = models.ManyToManyField(Vehicle)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"
