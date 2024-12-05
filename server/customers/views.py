from datetime import datetime

from django.contrib.auth import authenticate
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import CustomerProfile, ServiceItem, ServiceRequest
from .serializers import CustomerProfileSerializer, ServiceRequestSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register_customer(request):
    print("Received data:", request.data)  # Debug print
    serializer = CustomerProfileSerializer(data=request.data)
    if not serializer.is_valid():
        print("Validation errors:", serializer.errors)  # Debug print
    if serializer.is_valid():
        customer = serializer.save()
        # Generate token for the new user
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(customer.user)

        return Response(
            {
                "user": CustomerProfileSerializer(customer).data,
                "token": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
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


class ServiceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        print("\n=== Service Request Creation Debug ===")
        print("Raw request data:", request.data)
        print("User:", request.user)
        print("Auth header:", request.headers.get("Authorization"))

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Validation errors:", serializer.errors)
            return Response(
                {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Pass the customer profile in the context instead
            serializer.context["customer"] = request.user.customerprofile
            instance = serializer.save()
            print("Service request created successfully:", instance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print("Creation error:", str(e))
            import traceback

            print("Traceback:", traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        return ServiceRequest.objects.filter(
            customer=self.request.user.customerprofile
        ).order_by("-created_at")

    @action(detail=False, methods=["get"])
    def available_slots(self, request):
        date = request.query_params.get("date")
        if not date:
            return Response(
                {"error": "Date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TODO: Implement actual availability logic
        # For now, return dummy data
        available_slots = [
            "9:00 AM",
            "10:00 AM",
            "11:00 AM",
            "1:00 PM",
            "2:00 PM",
            "3:00 PM",
            "4:00 PM",
        ]

        return Response(available_slots)
