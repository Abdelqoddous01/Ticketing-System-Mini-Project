from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Ticket, Message, Notification
from .MC import Roles


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'role', 'is_active', 'first_name', 'last_name']
        read_only_fields = ['id']

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class TicketSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    assigned_to_email = serializers.EmailField(source='assigned_to.email', read_only=True)

    class Meta:
        model = Ticket
        fields = ['id','title','description','status','priority','created_by','created_by_email','assigned_to','assigned_to_email','created_at','updated_at',]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'ticket', 'author', 'author_email', 'author_role', 'body', 'created_at']
        read_only_fields = ['id', 'ticket', 'author', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    assigned_by_email = serializers.EmailField(source='assigned_by.email', read_only=True)
    ticket_title = serializers.CharField(source='ticket.title', read_only=True)

    class Meta:
        model = Notification
        fields = ['id','event_type','ticket','ticket_title','assigned_by','assigned_by_email','is_read','created_at',]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'password']

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(role=Roles.CUSTOMER, **validated_data)
