from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .serializers import MessageSerializer


def ticket_messages_group_name(ticket_id):
    return f'ticket_messages_{ticket_id}'


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
