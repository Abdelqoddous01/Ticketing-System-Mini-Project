import os

from django.core.management.base import BaseCommand

from api.models import User


class Command(BaseCommand):
    help = 'Seed default admin/agent/customer users on first database initialization.'

    def handle(self, *args, **options):
        if User.objects.exists():
            self.stdout.write(self.style.WARNING('Users already exist, skipping initial seed.'))
            return

        defaults = (
            {
                'email': os.getenv('INIT_ADMIN_EMAIL', 'admin@paylik.ma'),
                'password': os.getenv('INIT_ADMIN_PASSWORD', 'Admin@12345'),
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': os.getenv('INIT_AGENT_EMAIL', 'agent@paylik.ma'),
                'password': os.getenv('INIT_AGENT_PASSWORD', 'Agent@12345'),
                'role': 'agent',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'email': os.getenv('INIT_CUSTOMER_EMAIL', 'customer@paylik.ma'),
                'password': os.getenv('INIT_CUSTOMER_PASSWORD', 'Customer@12345'),
                'role': 'customer',
                'is_staff': False,
                'is_superuser': False,
            },
        )

        for user_data in defaults:
            User.objects.create_user(
                email=user_data['email'],
                password=user_data['password'],
                role=user_data['role'],
                is_staff=user_data['is_staff'],
                is_superuser=user_data['is_superuser'],
            )
            self.stdout.write(self.style.SUCCESS(f"Created {user_data['role']} user: {user_data['email']}"))
