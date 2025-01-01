import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
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

        except TokenError as e:
            logger.warning(f"Invalid token provided: {e}")
            await self.close()
            return
        except Exception as e:
            logger.error(f"Error authenticating WebSocket connection: {e}")
            await self.close()
            return

        # Join the workflow group
        await self.channel_layer.group_add("workflow", self.channel_name)
        await self.accept()

        # Send initial workflow state
        await self.send_workflow_state()

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
        # Leave the workflow group
        await self.channel_layer.group_discard("workflow", self.channel_name)

    @database_sync_to_async
    def get_workflow_state(self):
        try:
            from .cache import WorkflowCache

            board_state = WorkflowCache.get_board_state()
            return {
                "columns": board_state,
                "column_order": [c[0] for c in ServiceRequest.WORKFLOW_COLUMN_CHOICES],
            }
        except Exception as e:
            logger.error(f"Error getting workflow state: {e}")
            return None

    async def send_workflow_state(self):
        try:
            workflow_state = await self.get_workflow_state()
            if workflow_state:
                message = {"type": "workflow_update", "data": workflow_state}
                await self.send(text_data=json.dumps(message))
                logger.info(f"Successfully sent workflow state to {self.channel_name}")
        except Exception as e:
            logger.error(f"Error sending workflow state: {e}")

    async def receive(self, text_data):
        if not self.scope.get("user") or not self.scope["user"].is_staff:
            logger.warning("Unauthorized user attempted to send workflow update")
            return

        try:
            data = json.loads(text_data)
            if data.get("type") == "card_moved":
                await self.update_card_position(data)
                # Broadcast the update to all connected clients
                await self.channel_layer.group_send(
                    "workflow",
                    {
                        "type": "workflow_update",
                        "data": await self.get_workflow_state(),
                    },
                )
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding WebSocket message: {e}")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")

    @database_sync_to_async
    def update_card_position(self, data):
        try:
            from django.db import transaction
            from django.db.models import F

            from .models import ServiceRequest

            with transaction.atomic():
                # Get the service request to move
                service_request = ServiceRequest.objects.select_for_update().get(
                    id=data["card_id"]
                )
                old_column = service_request.workflow_column
                new_column = data["new_status"]

                if old_column != new_column:
                    # First, update positions in the old column
                    ServiceRequest.objects.filter(
                        workflow_column=old_column,
                        workflow_position__gt=service_request.workflow_position,
                    ).update(workflow_position=F("workflow_position") - 1)

                    # Get the highest position in the new column
                    max_position = (
                        ServiceRequest.objects.filter(
                            workflow_column=new_column
                        ).aggregate(models.Max("workflow_position"))[
                            "workflow_position__max"
                        ]
                        or -1
                    )

                    # Update the moved card
                    service_request.workflow_column = new_column
                    service_request.workflow_position = max_position + 1
                    service_request.save()

                    # Update cache
                    from .cache import WorkflowCache

                    WorkflowCache.move_card(
                        service_request.id,
                        new_column,
                        service_request.workflow_position,
                    )

                    logger.info(
                        f"Card {service_request.id} moved to {new_column} at position {service_request.workflow_position}"
                    )
                    return True

            return False

        except Exception as e:
            logger.error(f"Error moving card {data['card_id']}: {e}")
            return False

    async def workflow_update(self, event):
        """Forward workflow updates to the client"""
        try:
            await self.send(text_data=json.dumps(event))
            logger.info(f"Successfully sent workflow update to {self.channel_name}")
        except Exception as e:
            logger.error(f"Error sending workflow update: {e}")
