from customers.consumers import AppointmentConsumer, WorkflowConsumer
from django.urls import re_path

websocket_urlpatterns = [
    re_path(r"ws/appointments/$", AppointmentConsumer.as_asgi()),
    re_path(r"ws/workflow/$", WorkflowConsumer.as_asgi()),
]
