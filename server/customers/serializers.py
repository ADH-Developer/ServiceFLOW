from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import serializers

from .models import CustomerProfile, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ["make", "model", "year", "vin"]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}, "id": {"read_only": True}}


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    vehicles = VehicleSerializer(many=True, required=False)

    class Meta:
        model = CustomerProfile
        fields = ["user", "phone", "preferred_contact", "vehicles"]

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        vehicles_data = validated_data.pop("vehicles", [])

        # Create User instance
        user = User.objects.create_user(
            username=user_data["email"],
            email=user_data["email"],
            password=user_data["password"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
        )

        # Create CustomerProfile instance
        profile = CustomerProfile.objects.create(user=user, **validated_data)

        # Create Vehicle instances
        for vehicle_data in vehicles_data:
            vehicle = Vehicle.objects.create(**vehicle_data)
            profile.vehicles.add(vehicle)

        return profile

    def validate(self, data):
        user_data = data.get("user", {})

        # Validate required fields
        if not user_data.get("first_name"):
            raise serializers.ValidationError(
                {"user": {"first_name": "First name is required"}}
            )

        if not user_data.get("last_name"):
            raise serializers.ValidationError(
                {"user": {"last_name": "Last name is required"}}
            )

        if not user_data.get("email"):
            raise serializers.ValidationError({"user": {"email": "Email is required"}})

        # Validate email format
        try:
            validate_email(user_data["email"])
        except ValidationError:
            raise serializers.ValidationError(
                {"user": {"email": "Invalid email address"}}
            )

        if not data.get("phone"):
            raise serializers.ValidationError({"phone": "Phone number is required"})

        return data
