from rest_framework import serializers
from .identity import CNIC_RE, NAME_RE, PHONE_RE, normalize_cnic
from .models import Notification, User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'username', 'role', 'password', 'phone_number', 'cnic', 'profile_picture']
        extra_kwargs = {
            'phone_number': {'required': True, 'allow_null': False, 'allow_blank': False},
            'cnic': {'required': True, 'allow_null': False, 'allow_blank': False},
            'profile_picture': {'required': True, 'allow_null': False},
        }

    def validate_username(self, value):
        value = value.strip()
        if not NAME_RE.fullmatch(value):
            raise serializers.ValidationError('Name can contain letters and spaces only.')
        return value

    def validate_phone_number(self, value):
        if not PHONE_RE.fullmatch(value or ''):
            raise serializers.ValidationError('Phone number must use format 03XXXXXXXXX.')
        return value

    def validate_cnic(self, value):
        cnic = normalize_cnic(value)
        if not CNIC_RE.fullmatch(cnic):
            raise serializers.ValidationError('CNIC must use format 00000-0000000-0.')
        return cnic

    def validate_profile_picture(self, value):
        content_type = getattr(value, 'content_type', '')
        if not content_type.startswith('image/'):
            raise serializers.ValidationError('Profile picture must be an image file.')
        return value

    def validate_role(self, value):
        if value == 'admin':
            raise serializers.ValidationError("Cannot register as admin.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UserSerializer(serializers.ModelSerializer):
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'is_approved', 'is_suspended',
            'is_email_verified', 'is_identity_verified', 'identity_verification_message',
            'verification_status', 'phone_number', 'cnic', 'profile_picture'
        ]

    def get_verification_status(self, obj):
        if obj.is_email_verified and obj.is_identity_verified:
            return 'Verified'
        if obj.is_email_verified:
            return 'Email verified, CNIC pending'
        return 'Email pending'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read', 'created_at']
        read_only_fields = fields
