from django.urls import path
from .auth_views import register, login, logout
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path('auth/register/', register),
    path('auth/login/', login),
    path('auth/token/refresh/', TokenRefreshView.as_view()),
    path('auth/logout/', logout),
]