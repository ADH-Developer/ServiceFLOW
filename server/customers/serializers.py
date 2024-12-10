from datetime import datetime

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomerProfile, ServiceItem, ServiceRequest, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ["make", "model", "year", "vin"]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}, "email": {"required": True}}


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    groups = serializers.SerializerMethodField()
    token = serializers.SerializerMethodField()
    vehicles = VehicleSerializer(many=True, required=False)

    class Meta:
        model = CustomerProfile
        fields = ["user", "phone", "preferred_contact", "vehicles", "token", "groups"]

    def get_groups(self, obj):
        return [group.name for group in obj.user.groups.all()]

    def get_token(self, obj):
        refresh = RefreshToken.for_user(obj.user)
        return {"access": str(refresh.access_token), "refresh": str(refresh)}

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
            is_active=True,
        )

        # Create CustomerProfile instance
        profile = CustomerProfile.objects.create(user=user, **validated_data)

        # Create Vehicle instances if any
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


class ServiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceItem
        fields = ["service_type", "description", "urgency"]


class ServiceRequestSerializer(serializers.ModelSerializer):
    services = ServiceItemSerializer(many=True)
    vehicle = VehicleSerializer()

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "vehicle",
            "services",
            "appointment_date",
            "appointment_time",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def validate_vehicle(self, value):
        if not all(k in value for k in ("make", "model", "year")):
            raise serializers.ValidationError(
                "Vehicle must include make, model, and year"
            )
        try:
            value["year"] = int(value["year"])
        except (ValueError, TypeError):
            raise serializers.ValidationError("Year must be a valid number")
        return value

    def validate_services(self, value):
        if not value:
            raise serializers.ValidationError("At least one service is required")
        for service in value:
            if not all(
                k in service for k in ("service_type", "description", "urgency")
            ):
                raise serializers.ValidationError(
                    "Each service must include service_type, description, and urgency"
                )
            if service["urgency"] not in ("low", "medium", "high"):
                raise serializers.ValidationError(
                    "Service urgency must be 'low', 'medium', or 'high'"
                )
        return value

    def create(self, validated_data):
        try:
            vehicle_data = validated_data.pop("vehicle")
            services_data = validated_data.pop("services")

            # Get or create vehicle
            vehicle, _ = Vehicle.objects.get_or_create(**vehicle_data)

            # Get customer from context
            customer = self.context["request"].user.customerprofile

            # Create service request without explicitly passing customer
            service_request = ServiceRequest.objects.create(
                vehicle=vehicle,
                **validated_data,  # customer will be set by perform_create in the viewset
            )

            # Create service items
            for service_data in services_data:
                ServiceItem.objects.create(
                    service_request=service_request, **service_data
                )

            return service_request
        except Exception as e:
            print(f"Error in create method: {str(e)}")
            raise serializers.ValidationError(str(e))
