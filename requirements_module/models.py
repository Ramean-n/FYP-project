from django.db import models
from users.models import User
from jobs.models import Job

class RequirementForm(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='requirement_forms')
    instructions = models.TextField()
    fields_config = models.JSONField()
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Form for {self.job.title}"

class RequirementSubmission(models.Model):
    form = models.ForeignKey(RequirementForm, on_delete=models.CASCADE, related_name='submissions')
    participant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions')
    data = models.JSONField()  # stores participant answers
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('form', 'participant')