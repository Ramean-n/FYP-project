from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CNICRecord, User

class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'role', 'cnic', 'is_email_verified', 'is_identity_verified', 'is_approved', 'is_staff')
    list_editable = ('role', 'is_approved')
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password', 'phone_number', 'cnic', 'profile_picture')}),
        ('Role & Status', {'fields': ('role', 'is_email_verified', 'is_identity_verified', 'identity_verification_message', 'is_approved', 'is_suspended')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'role', 'phone_number', 'cnic', 'profile_picture', 'password1', 'password2'),
        }),
    )
    search_fields = ('email', 'username', 'cnic', 'phone_number')
    ordering = ('email',)

admin.site.register(User, UserAdmin)

@admin.register(CNICRecord)
class CNICRecordAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'cnic', 'uploaded_by', 'created_at')
    search_fields = ('full_name', 'normalized_name', 'cnic')
    readonly_fields = ('normalized_name', 'created_at')
