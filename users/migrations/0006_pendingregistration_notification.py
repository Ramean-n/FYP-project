from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_cnic_identity_verification'),
    ]

    operations = [
        migrations.CreateModel(
            name='PendingRegistration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('username', models.CharField(max_length=150)),
                ('role', models.CharField(choices=[('client', 'Client'), ('participant', 'Participant')], max_length=20)),
                ('password_hash', models.CharField(max_length=128)),
                ('phone_number', models.CharField(max_length=15)),
                ('cnic', models.CharField(max_length=15)),
                ('profile_picture', models.ImageField(upload_to='pending_profile_pics/')),
                ('token', models.CharField(max_length=6)),
                ('token_created_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('job_approval', 'Job Approval'), ('job_rejection', 'Job Rejection'), ('invitation', 'Invitation'), ('application_status', 'Application Status'), ('contract', 'Contract'), ('training', 'Training'), ('report', 'Report'), ('account', 'Account'), ('system', 'System')], default='system', max_length=40)),
                ('title', models.CharField(max_length=160)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
