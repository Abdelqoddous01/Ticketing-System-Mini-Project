from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate

from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer



@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    data = request.data

    user = User.objects.create_user(
        email=data['email'],
        password=data['password'],
        role='customer'
    )

    return Response(UserSerializer(user).data)



@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user = authenticate(username=email, password=password)

    if user is None:
        return Response({'error': 'Invalid credentials'}, status=401)

    refresh = RefreshToken.for_user(user)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })



@api_view(['POST'])
def logout(request):
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'status': 'logged out'})
    except Exception:
        return Response({'error': 'Invalid token'}, status=400)