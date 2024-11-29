from django.urls import include, path

urlpatterns = [
    path("api/customers/", include("customers.urls")),
]
