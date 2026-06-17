from rest_framework import serializers
from .models import RequirementForm, RequirementSubmission

class RequirementFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequirementForm
        fields = ['id', 'job', 'instructions', 'fields_config', 'published', 'created_at']
        read_only_fields = ['id', 'job', 'published', 'created_at']

class RequirementSubmissionSerializer(serializers.ModelSerializer):
    form_instructions = serializers.CharField(source='form.instructions', read_only=True)
    form_fields = serializers.JSONField(source='form.fields_config', read_only=True)
    job_id = serializers.IntegerField(source='form.job.id', read_only=True)
    job_title = serializers.CharField(source='form.job.title', read_only=True)

    class Meta:
        model = RequirementSubmission
        fields = ['id', 'form', 'participant', 'data', 'submitted_at', 'form_instructions', 'form_fields', 'job_id', 'job_title']
        read_only_fields = ['id', 'form', 'participant', 'submitted_at']
