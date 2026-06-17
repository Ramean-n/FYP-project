from django.db import models
from users.models import User

class Job(models.Model):
    MODE_CHOICES = [('internal', 'Internal'), ('external', 'External')]
    STATUS_CHOICES = [('open', 'Open'), ('closed', 'Closed'), ('pending', 'Pending Approval'), ('rejected', 'Rejected')]

    title = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    contract_template = models.TextField(blank=True, default='')
    crowdsourcing_mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs')
    deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class ParticipationRequest(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='participation_requests')
    participant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('job', 'participant')

    def __str__(self):
        return f"{self.participant.email} → {self.job.title} ({self.status})"

class JobContract(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='contracts')
    participant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts')
    content = models.TextField()
    signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('job', 'participant')

class TrainingMaterial(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='training_materials')
    file = models.FileField(upload_to='training/')
    title = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    training_completed_by = models.ManyToManyField(User, blank=True, related_name='completed_trainings')

class Invitation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='invitations')
    participant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('job', 'participant')

    def __str__(self):
        return f"{self.participant.email} invited to {self.job.title} ({self.status})"
