import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from .models import ServiceRequest
from .serializers import ServiceRequestSerializer

logger = logging.getLogger("django.channels")

User = get_user_model()


class AppointmentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get token from query string
        query_string = self.scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if not token:
            logger.warning("No token provided for WebSocket connection")
            await self.close()
            return

        try:
            # Verify the token and get the user
            access_token = AccessToken(token)
            user_id = access_token.payload.get("user_id")
            if not user_id:
                logger.warning("No user_id in token payload")
                await self.close()
                return

            user = await self.get_user(user_id)
            if not user:
                logger.warning(f"User {user_id} not found")
                await self.close()
                return

            self.scope["user"] = user
            logger.info(f"User {user} authenticated via token")

        except TokenError as e:
            logger.warning(f"Invalid token provided: {e}")
            await self.close()
            return
        except Exception as e:
            logger.error(f"Error authenticating WebSocket connection: {e}")
            await self.close()
            return

        # Check if user is authenticated
        if self.scope["user"].is_anonymous:
            logger.warning("Anonymous user tried to connect to appointments websocket")
            await self.close()
            return

        logger.info(f"User {self.scope['user']} connected to appointments websocket")

        # Join the appointments group
        await self.channel_layer.group_add("appointments", self.channel_name)
        await self.accept()

        # Send initial appointments data
        await self.send_today_appointments()

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def disconnect(self, close_code):
        logger.info(
            f"User {self.scope['user']} disconnected from appointments websocket"
        )
        # Leave the appointments group
        await self.channel_layer.group_discard("appointments", self.channel_name)

    async def receive(self, text_data):
        # Currently, we don't expect any messages from the client
        pass

    @database_sync_to_async
    def get_today_appointments(self):
        try:
            today = timezone.localtime().date()
            appointments = ServiceRequest.objects.filter(
                appointment_date=today
            ).order_by("appointment_time")
            return ServiceRequestSerializer(appointments, many=True).data
        except Exception as e:
            logger.error(f"Error getting today's appointments: {e}")
            return []

    async def send_today_appointments(self):
        try:
            # Get today's appointments and send them to the client
            appointments = await self.get_today_appointments()
            logger.info(
                f"Preparing to send today's appointments to client {self.channel_name}"
            )
            message = {"type": "appointments_list", "appointments": appointments}
            logger.info(f"Message structure: {json.dumps(message, indent=2)}")
            await self.send(text_data=json.dumps(message))
            logger.info(
                f"Successfully sent today's appointments to client {self.channel_name}"
            )
        except Exception as e:
            logger.error(f"Error sending today's appointments: {str(e)}")
            logger.exception(e)

    async def appointment_update(self, event):
        try:
            # Forward the appointment update to the client
            logger.info(f"Sending appointment update to {self.channel_name}")
            logger.info(f"Event data: {json.dumps(event, indent=2)}")
            message = {
                "type": "appointment_update",
                "action": event["action"],
                "appointment": event["appointment"],
            }
            logger.info(f"Message structure: {json.dumps(message, indent=2)}")
            await self.send(text_data=json.dumps(message))
            logger.info(f"Successfully sent appointment update to {self.channel_name}")
        except Exception as e:
            logger.error(f"Error sending appointment update: {str(e)}")
            logger.exception(e)


class WorkflowConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the workflow group
        await self.channel_layer.group_add("workflow", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the workflow group
        await self.channel_layer.group_discard("workflow", self.channel_name)

    async def receive(self, text_data):
        # Handle card movement updates from the client
        try:
            data = json.loads(text_data)
            if data["type"] == "card_moved":
                await self.update_card_position(data)
                # Broadcast the update to all connected clients
                await self.channel_layer.group_send(
                    "workflow",
                    {
                        "type": "card_position_update",
                        "card_id": data["card_id"],
                        "new_status": data["new_status"],
                    },
                )
        except json.JSONDecodeError:
            pass

    @database_sync_to_async
    def update_card_position(self, data):
        try:
            service_request = ServiceRequest.objects.get(id=data["card_id"])
            service_request.status = data["new_status"]
            service_request.save()
        except ServiceRequest.DoesNotExist:
            pass

    async def card_position_update(self, event):
        # Forward the card position update to the client
        await self.send(text_data=json.dumps(event))
