import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from customers.models import ServiceRequest
from customers.serializers import ServiceRequestSerializer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

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
            if not user or not user.is_staff:  # Only staff can access workflow
                logger.warning(f"User {user_id} not found or not staff")
                await self.close()
                return

            self.scope["user"] = user
            logger.info(f"User {user} authenticated via token")

            # Accept the connection first
            await self.accept()
            logger.info(f"Accepted WebSocket connection for {user}")

            # Then join the workflow group
            await self.channel_layer.group_add("workflow", self.channel_name)
            logger.info(f"Added {user} to workflow group")

            # Get initial workflow state
            workflow_state = await self.get_workflow_state()
            if workflow_state:
                try:
                    # Send initial state with a small delay to ensure connection is established
                    await self.send(
                        text_data=json.dumps(
                            {"type": "workflow_update", "data": workflow_state}
                        )
                    )
                    logger.info(f"Sent initial workflow state to {self.channel_name}")
                except Exception as e:
                    logger.error(f"Error sending initial workflow state: {e}")
                    logger.exception(e)
            else:
                logger.error("Failed to get initial workflow state")

        except TokenError as e:
            logger.warning(f"Invalid token provided: {e}")
            await self.close()
            return
        except Exception as e:
            logger.error(f"Error in WebSocket connection: {e}")
            logger.exception(e)
            await self.close()
            return

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def disconnect(self, close_code):
        logger.info(
            f"User {self.scope.get('user')} disconnected from workflow websocket"
        )
        await self.channel_layer.group_discard("workflow", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data["type"] == "card_moved":
                await self.handle_card_moved(data)
            elif data["type"] == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            logger.error("Received invalid JSON data")
        except KeyError:
            logger.error("Received data missing required fields")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            logger.exception(e)

    @database_sync_to_async
    def get_workflow_state(self):
        try:
            # Get all service requests grouped by status
            service_requests = ServiceRequest.objects.all()
            columns = {}
            for request in service_requests:
                if request.status not in columns:
                    columns[request.status] = []
                columns[request.status].append(ServiceRequestSerializer(request).data)
            return {"columns": columns}
        except Exception as e:
            logger.error(f"Error getting workflow state: {e}")
            logger.exception(e)
            return None

    @database_sync_to_async
    def update_card_position(self, card_id, new_status, position):
        try:
            with transaction.atomic():
                # Get the card
                card = ServiceRequest.objects.get(id=card_id)

                # Update positions of other cards in the target column
                ServiceRequest.objects.filter(
                    status=new_status, position__gte=position
                ).update(position=F("position") + 1)

                # Update the moved card
                card.status = new_status
                card.position = position
                card.save()

                return True, ServiceRequestSerializer(card).data
        except ServiceRequest.DoesNotExist:
            logger.error(f"Card {card_id} not found")
            return False, None
        except Exception as e:
            logger.error(f"Error updating card position: {e}")
            logger.exception(e)
            return False, None

    async def handle_card_moved(self, data):
        success, updated_card = await self.update_card_position(
            data["card_id"], data["new_column"], data["position"]
        )

        response = {
            "type": "card_moved",
            "success": success,
            "card_id": data["card_id"],
            "new_column": data["new_column"],
            "position": data["position"],
        }

        if success:
            # Broadcast the update to all clients
            await self.channel_layer.group_send(
                "workflow", {"type": "workflow.card_moved", "message": response}
            )
        else:
            # Send failure response only to the client that made the request
            await self.send(text_data=json.dumps(response))

    async def workflow_card_moved(self, event):
        # Forward the card moved message to the client
        await self.send(text_data=json.dumps(event["message"]))
