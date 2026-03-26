from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User, Ticket, Message, Notification
from .serializers import (UserSerializer,TicketSerializer,MessageSerializer,NotificationSerializer,)

from .permissions import IsAdmin, IsAgent, IsCustomer
from .realtime import broadcast_message_created, broadcast_notification_created

from .MC import *


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()

        return Response({'status': 'user deactivated'})



class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        user = self.request.user

        if user.role == Roles.CUSTOMER:
            return Ticket.objects.filter(created_by=user)

        elif user.role == Roles.AGENT:
            return Ticket.objects.filter(assigned_to=user)

        return Ticket.objects.all()


    def get_permissions(self):

        
        if self.action == 'create':
            return [IsAuthenticated(), IsCustomer()]

        if self.action in ['assign', 'priority', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]

        if self.action == 'status':
            return [IsAuthenticated(), IsAgent()]

        if self.action == 'close':
            return [IsAuthenticated()]


        return [IsAuthenticated()]


    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


    @action(detail=True, methods=['patch'])
    def assign(self, request, pk=None):
        ticket = self.get_object()

        raw_user_id = request.data.get('user_id')
        new_assignee = None

        if raw_user_id not in [None, '', 'null']:
            try:
                assignee_id = int(raw_user_id)
            except (TypeError, ValueError):
                return Response({'error': 'Invalid user_id'}, status=400)

            try:
                new_assignee = User.objects.only('id', 'role', 'is_active').get(pk=assignee_id)
            except User.DoesNotExist:
                return Response({'error': 'Agent not found'}, status=404)

            if not new_assignee.is_active:
                return Response({'error': 'Agent is inactive'}, status=400)

            if new_assignee.role != Roles.AGENT:
                return Response({'error': 'Assigned user must have agent role'}, status=400)

        previous_assignee_id = ticket.assigned_to_id
        ticket.assigned_to = new_assignee
        ticket.save()

        if new_assignee and new_assignee.id != previous_assignee_id:
            notification = Notification.objects.create(
                recipient=new_assignee,
                assigned_by=request.user,
                ticket=ticket,
                event_type=EventType.TICKET_ASSIGNED,
            )
            broadcast_notification_created(notification)

        return Response({'status': 'assigned to agent', 'assigned_to': ticket.assigned_to_id})


    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get('status')

        try:
            new_status = Status(new_status)
        except ValueError:
            return Response({'error': 'Invalid status'},status=400)

        ticket.status = new_status 
        ticket.save()

        return Response({'status': 'updated'})
    

    @action(detail=True, methods=['patch'])
    def priority(self, request, pk=None):
        ticket = self.get_object()
        new_priority = request.data.get('priority')

        try :
            new_priority = Priority(new_priority)
        except ValueError:
            return Response({'error': 'Invalid priority'}, status=400)

        ticket.priority = new_priority
        ticket.save()

        return Response({'priority': 'updated'})


    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        if request.user.role == Roles.CUSTOMER:
            return Response({'error': 'Not allowed'}, status=403)

        ticket = self.get_object()
        ticket.status = Status.CLOSED
        ticket.save()

        return Response({'status': 'ticket closed'})


    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        ticket = self.get_object()

        if request.method == 'GET':
            messages = ticket.messages.select_related('author').order_by('created_at')
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            serializer = MessageSerializer(data=request.data)
            if serializer.is_valid():
                message = serializer.save(ticket=ticket, author=request.user)
                broadcast_message_created(message)
                return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=400)



class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Message.objects.select_related('ticket', 'author')

        if user.role == Roles.ADMIN:
            return queryset

        if user.role == Roles.AGENT:
            return queryset.filter(ticket__assigned_to=user)

        return queryset.filter(ticket__created_by=user)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.select_related('ticket', 'assigned_by').filter(
            recipient=self.request.user,
        )

    @action(detail=False, methods=['get'])
    def unread(self, request):
        queryset = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])

        serializer = self.get_serializer(notification)
        return Response(serializer.data)
