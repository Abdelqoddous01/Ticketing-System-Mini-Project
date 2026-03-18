from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import UserViewSet, TicketViewSet, MessageViewSet
from .auth_views import register, login, logout
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'tickets', TicketViewSet)
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register),
    path('auth/login/', login),
    path('auth/token/refresh/', TokenRefreshView.as_view()),
    path('auth/logout/', logout),
]