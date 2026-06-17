from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from jobs.models import Job
from jobs.permissions import IsClient, IsParticipant, IsApproved
from .models import RequirementForm, RequirementSubmission
from .serializers import RequirementFormSerializer, RequirementSubmissionSerializer

# ─── CLIENT VIEWS ────────────────────────────────────────────

class CreateRequirementFormView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RequirementFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(job=job)
            return Response({'message': 'Form created.', 'form': serializer.data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ListFormsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        forms = RequirementForm.objects.filter(job=job)
        return Response(RequirementFormSerializer(forms, many=True).data)

class PublishFormView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id, form_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            form = RequirementForm.objects.get(id=form_id, job=job)
        except (Job.DoesNotExist, RequirementForm.DoesNotExist):
            return Response({'error': 'Form not found'}, status=status.HTTP_404_NOT_FOUND)

        form.published = True
        form.save()
        return Response({'message': 'Form published successfully.'})

class FormSubmissionsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id, form_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            form = RequirementForm.objects.get(id=form_id, job=job)
        except (Job.DoesNotExist, RequirementForm.DoesNotExist):
            return Response({'error': 'Form not found'}, status=status.HTTP_404_NOT_FOUND)

        submissions = form.submissions.all()
        return Response(RequirementSubmissionSerializer(submissions, many=True).data)

class ClientGetFormView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id, form_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
            form = RequirementForm.objects.get(id=form_id, job=job)
        except (Job.DoesNotExist, RequirementForm.DoesNotExist):
            return Response({'error': 'Form not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(RequirementFormSerializer(form).data)

# ─── PARTICIPANT VIEWS ────────────────────────────────────────

class ListPublishedFormsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        forms = RequirementForm.objects.filter(job=job, published=True)
        return Response(RequirementFormSerializer(forms, many=True).data)

class ViewFormView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request, job_id, form_id):
        try:
            job = Job.objects.get(id=job_id)
            form = RequirementForm.objects.get(id=form_id, job=job)
        except (Job.DoesNotExist, RequirementForm.DoesNotExist):
            return Response({'error': 'Form not found'}, status=status.HTTP_404_NOT_FOUND)

        if not form.published:
            return Response({'error': 'Form is not published yet'}, status=status.HTTP_403_FORBIDDEN)

        return Response(RequirementFormSerializer(form).data)

class RequirementSubmissionStatusView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request, job_id, form_id):
        try:
            job = Job.objects.get(id=job_id)
            form = RequirementForm.objects.get(id=form_id, job=job)
        except (Job.DoesNotExist, RequirementForm.DoesNotExist):
            return Response({'error': 'Form not found'}, status=status.HTTP_404_NOT_FOUND)

        submitted = RequirementSubmission.objects.filter(form=form, participant=request.user).exists()
        return Response({'submitted': submitted})

class MySubmittedFormsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request):
        submissions = RequirementSubmission.objects.filter(
            participant=request.user
        ).select_related('form', 'form__job').order_by('-submitted_at')
        return Response(RequirementSubmissionSerializer(submissions, many=True).data)

class SubmitRequirementsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def validate_submission_data(self, form, data):
        if not isinstance(data, dict) or not data:
            return 'Submission data cannot be empty'

        fields = form.fields_config.get('fields', []) if isinstance(form.fields_config, dict) else []
        for field in fields:
            if not field.get('required'):
                continue

            name = field.get('name')
            value = data.get(name)
            field_type = field.get('type')

            if field_type == 'rating':
                if not isinstance(value, int) or value <= 0:
                    return f'{field.get("label", "Required field")} is required'
            elif value is None or (isinstance(value, str) and not value.strip()):
                return f'{field.get("label", "Required field")} is required'

        return None

    def post(self, request, job_id, form_id):
        try:
            job = Job.objects.get(id=job_id)
            form = RequirementForm.objects.get(id=form_id, job=job)
        except (Job.DoesNotExist, RequirementForm.DoesNotExist):
            return Response({'error': 'Form not found'}, status=status.HTTP_404_NOT_FOUND)

        if not form.published:
            return Response({'error': 'Form is not published yet'}, status=status.HTTP_403_FORBIDDEN)

        if RequirementSubmission.objects.filter(form=form, participant=request.user).exists():
            return Response({'error': 'You have already submitted this form'}, status=status.HTTP_400_BAD_REQUEST)

        validation_error = self.validate_submission_data(form, request.data.get('data'))
        if validation_error:
            return Response({'error': validation_error}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RequirementSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(form=form, participant=request.user)
            return Response({'message': 'Requirements submitted successfully.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
