"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from api.routing import websocket_urlpatterns
from api.ws_auth import JwtAuthMiddlewareStack

application = ProtocolTypeRouter(
    {
        'http': django_asgi_app,
        'websocket': JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
