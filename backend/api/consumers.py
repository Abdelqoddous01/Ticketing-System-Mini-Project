import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Ticket
from .realtime import ticket_messages_group_name, user_notifications_group_name

from .MC import Roles

class TicketMessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        ticket_id = self.scope.get('url_route', {}).get('kwargs', {}).get('ticket_id')

        try:
            self.ticket_id = int(ticket_id)
        except (TypeError, ValueError):
            await self.close(code=4400)
            return

        can_access = await self.user_can_access_ticket(
            user_id=user.id,
            user_role=user.role,
            ticket_id=self.ticket_id,
        )

        if not can_access:
            await self.close(code=4403)
            return

        self.group_name = ticket_messages_group_name(self.ticket_id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Client-to-server WebSocket messages are currently ignored.
        return

    async def message_created(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    'type': 'message.created',
                    'payload': event.get('payload'),
                }
            )
        )

    @database_sync_to_async
    def user_can_access_ticket(self, user_id, user_role, ticket_id):
        try:
            ticket = Ticket.objects.only('id', 'created_by_id', 'assigned_to_id').get(pk=ticket_id)
        except Ticket.DoesNotExist:
            return False

        if user_role == Roles.ADMIN:
            return True

        if user_role == Roles.AGENT:
            return ticket.assigned_to_id == user_id

        return ticket.created_by_id == user_id


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.group_name = user_notifications_group_name(user.id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Client-to-server WebSocket messages are currently ignored.
        return

    async def notification_created(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    'type': 'notification.created',
                    'payload': event.get('payload'),
                }
            )
        )
