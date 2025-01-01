from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Customer router for customer-specific endpoints
customer_router = DefaultRouter()
customer_router.register(
    r"service-requests", views.ServiceRequestViewSet, basename="service-request"
)

# Admin router for admin-specific endpoints
admin_router = DefaultRouter()
admin_router.register(r"workflow", views.WorkflowViewSet, basename="workflow")

urlpatterns = [
    path("register/", views.register_customer, name="register"),
    path("login/", views.login_customer, name="login"),
    path("", include(customer_router.urls)),
    path("admin/", include(admin_router.urls)),
]
