from django.db import models
from users.models import User
from jobs.models import Job

class Report(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='report')
    generated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.JSONField()
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for {self.job.title}"