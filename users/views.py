from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from pyisemail import is_email
import re
import zipfile
from .identity import CNIC_RE, PHONE_RE, normalize_cnic, normalize_name, parse_identity_file
from .models import User, EmailVerificationToken, CNICRecord, PendingRegistration, Notification
from .serializers import RegisterSerializer, UserSerializer, NotificationSerializer
from jobs.permissions import IsAdmin
from rest_framework.permissions import IsAuthenticated, AllowAny

def validate_pakistani_phone(phone):
    return PHONE_RE.fullmatch(phone or '') is not None

def send_verification_email(user, token):
    name = getattr(user, 'username', 'there')
    email = getattr(user, 'email', user)
    send_mail(
        subject='Verify your Requify account',
        message=f'''
Hi {name},

Welcome to Requify! Your verification code is:

{token}

Enter this code to verify your email address.
This code expires in 24 hours.

If you did not register on Requify, please ignore this email.

Best regards,
The Requify Team
        ''',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )

def create_notification(recipient, notification_type, title, message):
    if recipient:
        Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
        )

BLOCKED_DOMAINS = [
    'fakemail.com', 'mailinator.com', 'guerrillamail.com', 'tempmail.com',
    'throwaway.email', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
    'grr.la', 'guerrillamail.info', 'spam4.me', 'trashmail.com', 'dispostable.com',
    'maildrop.cc', 'spamgourmet.com', 'tempr.email', 'discard.email',
    'fakeinbox.com', 'spamherr.com', 'mailnull.com', 'spamspot.com',
    'trashmail.at', 'trashmail.io', 'tempinbox.com', 'spamevader.com',
]


def is_valid_email_domain(email):
    try:
        domain = email.split('@')[1].lower()
        return domain not in BLOCKED_DOMAINS
    except (AttributeError, IndexError):
        return False


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        phone = request.data.get('phone_number', '')
        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        if phone and not validate_pakistani_phone(phone):
            return Response({'error': 'Invalid phone number. Use format: 03XXXXXXXXX'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not is_valid_email_domain(email):
            return Response({'error': 'Please use a real email address. Disposable emails are not allowed.'}, status=status.HTTP_400_BAD_REQUEST)


        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            token = EmailVerificationToken.generate_token()
            existing = PendingRegistration.objects.filter(email__iexact=data['email']).first()
            if existing and existing.profile_picture:
                existing.profile_picture.delete(save=False)
            pending, _ = PendingRegistration.objects.update_or_create(
                email=data['email'],
                defaults={
                    'username': data['username'],
                    'role': data['role'],
                    'password_hash': make_password(data['password']),
                    'phone_number': data['phone_number'],
                    'cnic': data['cnic'],
                    'profile_picture': data['profile_picture'],
                    'token': token,
                }
            )
            try:
                send_verification_email(pending, token)
                return Response({
                    'message': 'Registration successful! Please check your email for the verification code.'
                }, status=status.HTTP_201_CREATED)
            except Exception:
                return Response({
                    'message': 'Registration successful! Email verification could not be sent. Contact admin.'
                }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')

        try:
            pending = PendingRegistration.objects.get(email__iexact=email)
            if pending.is_token_expired():
                return Response({'error': 'Verification code expired. Please resend a new code.'}, status=status.HTTP_400_BAD_REQUEST)
            if pending.token != token:
                return Response({'error': 'Invalid email or token.'}, status=status.HTTP_400_BAD_REQUEST)
            match = CNICRecord.objects.filter(
                cnic=normalize_cnic(pending.cnic),
                normalized_name=normalize_name(pending.username)
            ).exists()
            if not match:
                return Response({
                    'error': 'CNIC verification failed. Your full name and CNIC do not match the uploaded verification records.'
                }, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(email__iexact=pending.email).exists():
                pending.delete()
                return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            user = User(
                email=pending.email,
                username=pending.username,
                role=pending.role,
                password=pending.password_hash,
                phone_number=pending.phone_number,
                cnic=pending.cnic,
                profile_picture=pending.profile_picture,
                is_email_verified=True,
                is_identity_verified=True,
                is_approved=True,
                identity_verification_message='Matched against imported CNIC records.',
            )
            user.save()
            from profiles.models import Profile
            Profile.objects.update_or_create(
                user=user,
                defaults={'profile_picture': pending.profile_picture}
            )
            pending.delete()
            create_notification(user, 'account', 'Account verified', 'Your account is verified and ready to use.')
            return Response({'message': 'Email and CNIC verified successfully. Your account is approved and ready to use.'})
        except PendingRegistration.DoesNotExist:
            return Response({'error': 'Invalid email or token.'}, status=status.HTTP_400_BAD_REQUEST)

class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        try:
            if User.objects.filter(email__iexact=email, is_email_verified=True).exists():
                return Response({'message': 'Email already verified.'})
            pending = PendingRegistration.objects.get(email__iexact=email)
            token = pending.refresh_token()
            send_verification_email(pending, token)
            return Response({'message': 'Verification code resent!'})
        except PendingRegistration.DoesNotExist:
            return Response({'error': 'Pending registration not found. Please register again.'}, status=status.HTTP_404_NOT_FOUND)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_email_verified and user.role != 'admin':
            return Response({'error': 'Please verify your email first.'}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_email_verified:
            return Response({'error': 'Please verify your email first.'}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_approved:
            return Response({'error': 'Your account is pending admin approval'}, status=status.HTTP_403_FORBIDDEN)
        if user.is_suspended:
            return Response({'error': 'Your account has been suspended'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })

class PendingUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(is_approved=False, is_email_verified=True, is_identity_verified=True, role__in=['client', 'participant'])
        return Response(UserSerializer(users, many=True).data)

class ImportCNICRecordsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'CSV or Excel file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rows = parse_identity_file(upload)
        except (ValueError, KeyError, zipfile.BadZipFile) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Could not read the uploaded identity file.'}, status=status.HTTP_400_BAD_REQUEST)

        imported = 0
        skipped = 0
        with transaction.atomic():
            CNICRecord.objects.all().delete()
            for row in rows:
                full_name = row['full_name']
                cnic = normalize_cnic(row['cnic'])
                if not CNIC_RE.fullmatch(cnic):
                    skipped += 1
                    continue
                CNICRecord.objects.create(
                    cnic=cnic,
                    full_name=full_name,
                    normalized_name=normalize_name(full_name),
                    uploaded_by=request.user,
                )
                imported += 1

        return Response({'message': f'Verification database replaced with {imported} CNIC record(s).', 'imported': imported, 'skipped': skipped})

class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.filter(
            is_approved=True,
            role__in=['client', 'participant']
        ).order_by('username')
        return Response(UserSerializer(users, many=True).data)

class ApproveUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'approve':
            user.is_approved = True
            user.save()
            return Response({'message': 'User approved.'})
        elif action == 'reject':
            user.delete()
            return Response({'message': 'User rejected and removed.'})
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

class SuspendUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, role__in=['client', 'participant'])
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.is_suspended:
            return Response({'message': 'User is already suspended.'})

        user.is_suspended = True
        user.save(update_fields=['is_suspended'])
        return Response({'message': 'User suspended successfully.', 'user': UserSerializer(user).data})

class ReactivateUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, role__in=['client', 'participant'])
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if not user.is_suspended:
            return Response({'message': 'User is already active.'})

        user.is_suspended = False
        user.save(update_fields=['is_suspended'])
        return Response({'message': 'User reactivated successfully.', 'user': UserSerializer(user).data})

class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = request.user.notifications.all()
        return Response(NotificationSerializer(notifications, many=True).data)

class MarkNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({'message': 'Notifications marked as read.'})
