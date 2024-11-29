from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import CustomerProfile
from .serializers import CustomerProfileSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register_customer(request):
    serializer = CustomerProfileSerializer(data=request.data)
    if serializer.is_valid():
        try:
            customer = serializer.save()
            return Response(
                {"message": "Registration successful", "customer_id": customer.id},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {"message": "Registration failed", "errors": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_customer(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"message": "Please provide both email and password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=email, password=password)

    if user:
        try:
            customer = CustomerProfile.objects.get(user=user)
            serializer = CustomerProfileSerializer(customer)
            return Response({"message": "Login successful", "data": serializer.data})
        except CustomerProfile.DoesNotExist:
            return Response(
                {"message": "Customer profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    return Response(
        {"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
    )
