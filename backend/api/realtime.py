from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .serializers import MessageSerializer, NotificationSerializer


def ticket_messages_group_name(ticket_id):
    return f'ticket_messages_{ticket_id}'


def user_notifications_group_name(user_id):
    return f'user_notifications_{user_id}'


def broadcast_message_created(message):
    channel_layer = get_channel_layer()

    if channel_layer is None:
        return

    payload = MessageSerializer(message).data

    async_to_sync(channel_layer.group_send)(
        ticket_messages_group_name(message.ticket_id),
        {
            'type': 'message.created',
            'payload': payload,
        },
    )


def broadcast_notification_created(notification):
    channel_layer = get_channel_layer()

    if channel_layer is None:
        return

    payload = NotificationSerializer(notification).data

    async_to_sync(channel_layer.group_send)(
        user_notifications_group_name(notification.recipient_id),
        {
            'type': 'notification.created',
            'payload': payload,
        },
    )
