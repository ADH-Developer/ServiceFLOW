import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache

logger = logging.getLogger(__name__)


class AppointmentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the appointments group
        await self.channel_layer.group_add("appointments", self.channel_name)
        await self.accept()

        # Send initial data
        count = await self.get_pending_count()
        await self.send(json.dumps({"type": "pending_count", "count": count}))

    async def disconnect(self, close_code):
        # Leave the appointments group
        await self.channel_layer.group_discard("appointments", self.channel_name)

    @database_sync_to_async
    def get_pending_count(self):
        from customers.models import ServiceRequest

        try:
            # Get count from cache first
            count = cache.get("pending_appointments_count")
            if count is None:
                # If not in cache, get from database
                count = ServiceRequest.objects.filter(status="pending").count()
                # Cache for 5 minutes
                cache.set("pending_appointments_count", count, 300)
            return count
        except Exception as e:
            logger.error(f"Error getting pending count: {e}")
            # Fallback to database
            return ServiceRequest.objects.filter(status="pending").count()

    async def appointment_update(self, event):
        # Send appointment update to WebSocket
        await self.send(json.dumps({"type": "pending_count", "count": event["count"]}))
