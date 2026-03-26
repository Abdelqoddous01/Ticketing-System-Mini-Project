
from rest_framework.permissions import BasePermission
from .MC import Roles

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == Roles.ADMIN


class IsAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == Roles.AGENT


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == Roles.CUSTOMER