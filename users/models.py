from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random
import string

class UserManager(BaseUserManager):
    def create_user(self, email, username, role, password=None, phone_number=None, cnic=None, profile_picture=None):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            username=username,
            role=role,
            phone_number=phone_number,
            cnic=cnic,
            profile_picture=profile_picture
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password):
        user = self.create_user(email, username, role='admin', password=password)
        user.is_staff = True
        user.is_superuser = True
        user.is_approved = True
        user.is_email_verified = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('participant', 'Participant'),
        ('admin', 'Admin'),
    ]
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    cnic = models.CharField(max_length=15, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    is_identity_verified = models.BooleanField(default=False)
    identity_verification_message = models.CharField(max_length=255, blank=True)
    is_approved = models.BooleanField(default=False)
    is_suspended = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"

class EmailVerificationToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='verification_token')
    token = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Token for {self.user.email}"

    @staticmethod
    def generate_token():
        return ''.join(random.choices(string.digits, k=6))

class PendingRegistration(models.Model):
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('participant', 'Participant'),
    ]
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    password_hash = models.CharField(max_length=128)
    phone_number = models.CharField(max_length=15)
    cnic = models.CharField(max_length=15)
    profile_picture = models.ImageField(upload_to='pending_profile_pics/')
    token = models.CharField(max_length=6)
    token_created_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_token_expired(self):
        return self.token_created_at < timezone.now() - timedelta(hours=24)

    def refresh_token(self):
        self.token = EmailVerificationToken.generate_token()
        self.save(update_fields=['token', 'token_created_at'])
        return self.token

    def __str__(self):
        return f"Pending registration for {self.email}"

class Notification(models.Model):
    TYPE_CHOICES = [
        ('job_approval', 'Job Approval'),
        ('job_rejection', 'Job Rejection'),
        ('invitation', 'Invitation'),
        ('application_status', 'Application Status'),
        ('contract', 'Contract'),
        ('training', 'Training'),
        ('report', 'Report'),
        ('account', 'Account'),
        ('system', 'System'),
    ]
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient.email}"

class CNICRecord(models.Model):
    full_name = models.CharField(max_length=150)
    normalized_name = models.CharField(max_length=150, db_index=True)
    cnic = models.CharField(max_length=15, unique=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_cnic_records')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} - {self.cnic}"
