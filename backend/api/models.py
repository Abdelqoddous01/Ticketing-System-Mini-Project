from django.db import models
from django.contrib.auth.models import AbstractUser



class User(AbstractUser):
    ROLE_CHOICES = [('customer', 'Customer'),('agent', 'Agent'),('admin', 'Admin'),]

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email



class Ticket(models.Model):
    STATUS_CHOICES = [('open', 'Open'),('in_progress', 'In Progress'),('resolved', 'Resolved'),('closed', 'Closed'),]
    PRIORITY_CHOICES = [('low', 'Low'),('medium', 'Medium'),('high', 'High'),]

    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')

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