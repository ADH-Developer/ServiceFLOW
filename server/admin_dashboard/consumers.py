import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import Group


class AdminDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        self.user_roles = await self.get_user_roles()

        # Join role-specific groups for broadcasts
        for role in self.user_roles:
            await self.channel_layer.group_add(f"role_{role}", self.channel_name)

        await self.accept()

        # Send initial roles to client
        await self.send(json.dumps({"type": "roles_update", "roles": self.user_roles}))

    @database_sync_to_async
    def get_user_roles(self):
        return list(self.user.groups.values_list("name", flat=True))

    async def disconnect(self, close_code):
        # Leave role groups
        for role in self.user_roles:
            await self.channel_layer.group_discard(f"role_{role}", self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Handle different message types
        if data["type"] == "request_update":
            # Handle update requests
            pass

    async def broadcast_update(self, event):
        # Broadcast updates to connected clients
        await self.send(text_data=json.dumps(event))
