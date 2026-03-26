from django.db import models


class Roles(models.TextChoices):
    CUSTOMER = 'customer', 'Customer'
    AGENT = 'agent', 'Agent'
    ADMIN = 'admin', 'Admin'

class Status(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In Progress"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"

class Priority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"

class EventType(models.TextChoices):
    TICKET_ASSIGNED = "ticket_assigned", "Ticket Assigned"