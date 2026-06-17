from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, PendingUsersView, AdminUsersView,
    ApproveUserView, SuspendUserView, ReactivateUserView,
    VerifyEmailView, ResendVerificationView, ImportCNICRecordsView,
    NotificationsView, MarkNotificationsReadView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    path('notifications/', NotificationsView.as_view(), name='notifications'),
    path('notifications/read/', MarkNotificationsReadView.as_view(), name='notifications-read'),
    path('pending/', PendingUsersView.as_view(), name='pending-users'),
    path('admin/users/', AdminUsersView.as_view(), name='admin-users'),
    path('admin/cnic-records/import/', ImportCNICRecordsView.as_view(), name='import-cnic-records'),
    path('admin/<int:user_id>/approve/', ApproveUserView.as_view(), name='approve-user'),
    path('admin/<int:user_id>/suspend/', SuspendUserView.as_view(), name='suspend-user'),
    path('admin/<int:user_id>/reactivate/', ReactivateUserView.as_view(), name='reactivate-user'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
