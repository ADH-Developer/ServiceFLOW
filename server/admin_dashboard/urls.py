from django.urls import path

from . import views

urlpatterns = [
    path("roles/", views.get_user_roles, name="get-user-roles"),
]
