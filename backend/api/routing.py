from django.urls import re_path

from .consumers import TicketMessageConsumer, NotificationConsumer


websocket_urlpatterns = [
    re_path(r'^ws/tickets/(?P<ticket_id>\d+)/messages/$', TicketMessageConsumer.as_asgi()),
    re_path(r'^ws/notifications/$', NotificationConsumer.as_asgi()),
]
