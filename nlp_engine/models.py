from django.db import models
from jobs.models import Job


class NLPResult(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='nlp_result')

    # Core NLP output
    keywords = models.JSONField(default=list)
    clusters = models.JSONField(default=list)          # [{'label': str, 'requirements': [str]}]
    duplicates = models.JSONField(default=list)
    priorities = models.JSONField(default=dict)

    # Improved fields
    low_quality_requirements = models.JSONField(default=list)   # vague / ambiguous responses
    mcq_statistics = models.JSONField(default=dict)             # MCQ vote tallies per question
    statistics = models.JSONField(default=dict)                 # run-level stats
    spelling_corrections = models.JSONField(default=dict)       # {original: corrected}
    polished_requirements = models.JSONField(
    default=dict,
    blank=True,
    null=True
)
    processed_at = models.DateTimeField(auto_now=True)
    is_complete = models.BooleanField(default=False)

    def __str__(self):
        return f"NLP Result for {self.job.title}"
    
