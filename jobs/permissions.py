from rest_framework.permissions import BasePermission

class IsClient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'client'

class IsParticipant(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'participant'

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsApproved(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_approved
            and not request.user.is_suspended
        )
