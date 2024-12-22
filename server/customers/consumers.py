import json
import logging
from datetime import date

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache

from .cache import WorkflowCache

logger = logging.getLogger(__name__)


class AppointmentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info("WebSocket connecting...")
        await self.channel_layer.group_add("appointments", self.channel_name)
        await self.accept()
        logger.info("WebSocket connected")

        # Send initial data
        count = await self.get_pending_count()
        logger.info(f"Sending initial pending count: {count}")
        await self.send(json.dumps({"type": "pending_count", "count": count}))

        # Send initial today's appointments
        appointments = await self.get_today_appointments()
        logger.info(
            f"Sending initial today's appointments: {len(appointments)} appointments"
        )
        await self.send(
            json.dumps({"type": "today_appointments", "appointments": appointments})
        )

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected with code: {close_code}")
        # Leave the appointments group
        await self.channel_layer.group_discard("appointments", self.channel_name)

    @database_sync_to_async
    def get_pending_count(self):
        from .cache import AppointmentCache

        count = AppointmentCache.get_pending_count()
        if count is None:
            # Fallback to database
            from customers.models import ServiceRequest

            count = ServiceRequest.objects.filter(status="pending").count()
        return count

    @database_sync_to_async
    def get_today_appointments(self):
        from .cache import AppointmentCache

        appointments = AppointmentCache.get_today_appointments()
        if appointments is None:
            # Fallback to database
            from datetime import date

            from customers.models import ServiceRequest
            from customers.serializers import ServiceRequestSerializer

            today = date.today()
            appointments_queryset = (
                ServiceRequest.objects.filter(appointment_date=today)
                .select_related("customer__user", "vehicle")
                .prefetch_related("services")
                .order_by("appointment_time")
            )
            serializer = ServiceRequestSerializer(appointments_queryset, many=True)
            appointments = serializer.data
        return appointments

    async def appointment_update(self, event):
        """Handle appointment updates from the channel layer"""
        logger.info(f"Received appointment update event: {event}")
        try:
            message_type = event.get("message_type")
            if message_type == "pending_count":
                await self.send(
                    json.dumps({"type": "pending_count", "count": event["count"]})
                )
                logger.info(f"Sent pending count update: {event['count']}")
            elif message_type == "today_appointments":
                await self.send(
                    json.dumps(
                        {
                            "type": "today_appointments",
                            "appointments": event["appointments"],
                        }
                    )
                )
                logger.info(
                    f"Sent today's appointments update: {len(event['appointments'])} appointments"
                )
        except Exception as e:
            logger.error(f"Error in appointment_update: {e}")


class WorkflowConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Add to workflow group
        await self.channel_layer.group_add("workflow", self.channel_name)
        await self.accept()

        # Send initial board state
        board_state = await database_sync_to_async(WorkflowCache.get_board_state)()
        await self.send(
            text_data=json.dumps({"type": "board_update", "board": board_state})
        )

    async def disconnect(self, close_code):
        # Remove from workflow group
        await self.channel_layer.group_discard("workflow", self.channel_name)

    async def receive(self, text_data):
        """Handle incoming messages (not used for now)"""
        pass

    async def board_update(self, event):
        """Send board updates to clients"""
        await self.send(
            text_data=json.dumps({"type": "board_update", "board": event["board"]})
        )

    async def card_move(self, event):
        """Send card move updates to clients"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "card_move",
                    "card_id": event["card_id"],
                    "from_column": event["from_column"],
                    "to_column": event["to_column"],
                    "position": event["position"],
                }
            )
        )

    async def card_update(self, event):
        """Send card data updates to clients"""
        await self.send(
            text_data=json.dumps({"type": "card_update", "card": event["card"]})
        )

    async def column_update(self, event):
        """Send column setting updates to clients"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "column_update",
                    "column": event["column"],
                    "settings": event["settings"],
                }
            )
        )

    async def comment_update(self, event):
        """Send comment updates to clients"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "comment_update",
                    "card_id": event["card_id"],
                    "comment": event["comment"],
                    "action": event["action"],  # 'add' or 'delete'
                }
            )
        )

    async def label_update(self, event):
        """Send label updates to clients"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "label_update",
                    "card_id": event["card_id"],
                    "label": event["label"],
                    "action": event["action"],  # 'add' or 'remove'
                }
            )
        )
