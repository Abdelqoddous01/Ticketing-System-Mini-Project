from django.contrib import admin
from .models import User , Ticket , Message, Notification

admin.site.register(User)
admin.site.register(Ticket)
admin.site.register(Message)
admin.site.register(Notification)
