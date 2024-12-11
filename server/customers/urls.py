from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(
    r"service-requests", views.ServiceRequestViewSet, basename="service-request"
)

urlpatterns = [
    path("register/", views.register_customer, name="register"),
    path("login/", views.login_customer, name="login"),
    path("", include(router.urls)),
]
