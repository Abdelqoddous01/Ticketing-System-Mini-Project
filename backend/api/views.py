from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User, Ticket, Message
from .serializers import UserSerializer, TicketSerializer, MessageSerializer
from .permissions import IsAdmin, IsAgent, IsCustomer



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

        if user.role == 'customer':
            return Ticket.objects.filter(created_by=user)

        elif user.role == 'agent':
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
        ticket.assigned_to_id = request.data.get('user_id')
        ticket.save()

        return Response({'status': 'assigned to agent'})


    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Ticket.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=400)

        ticket.status = new_status
        ticket.save()

        return Response({'status': 'updated'})


    @action(detail=True, methods=['patch'])
    def priority(self, request, pk=None):
        ticket = self.get_object()
        new_priority = request.data.get('priority')

        if new_priority not in dict(Ticket.PRIORITY_CHOICES):
            return Response({'error': 'Invalid priority'}, status=400)

        ticket.priority = new_priority
        ticket.save()

        return Response({'priority': 'updated'})


    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        if request.user.role == 'customer':
            return Response({'error': 'Not allowed'}, status=403)

        ticket = self.get_object()
        ticket.status = 'closed'
        ticket.save()

        return Response({'status': 'ticket closed'})


    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        ticket = self.get_object()

        if request.method == 'GET':
            messages = ticket.messages.all()
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)

        if request.method == 'POST':
            serializer = MessageSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(ticket=ticket, author=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=400)



class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Message.objects.select_related('ticket', 'author')

        if user.role == 'admin':
            return queryset

        if user.role == 'agent':
            return queryset.filter(ticket__assigned_to=user)

        return queryset.filter(ticket__created_by=user)