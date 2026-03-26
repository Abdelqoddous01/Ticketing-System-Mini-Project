from django.db import models
from django.contrib.auth.models import AbstractUser , BaseUserManager
from .MC import *

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Roles.choices, default=Roles.CUSTOMER)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email



class Ticket(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=10, choices=Priority, default=Priority.MEDIUM)

    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets_created')
    assigned_to = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='tickets_assigned')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title



class Message(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message by {self.author.email}"


class Notification(models.Model):

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    assigned_by = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='sent_notifications',)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='notifications')
    event_type = models.CharField(max_length=32,choices=EventType,default=EventType.TICKET_ASSIGNED,)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification({self.event_type}) to {self.recipient.email}"
