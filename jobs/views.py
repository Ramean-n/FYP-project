from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Job, ParticipationRequest, JobContract, TrainingMaterial
from .serializers import (JobSerializer, CreateJobSerializer,
    ParticipationRequestSerializer, JobContractSerializer, TrainingMaterialSerializer)
from .permissions import IsClient, IsParticipant, IsAdmin, IsApproved
from .models import Invitation
from users.models import User
from users.views import create_notification

DEFAULT_CONTRACT_TEMPLATE = """Participation Agreement

Job: {{job_title}}
Participant: {{participant_name}}
Participant email: {{participant_email}}
Participant phone: {{participant_phone}}
Participant CNIC: {{participant_cnic}}
Client: {{client_name}}

The participant agrees to review the provided training materials and submit requirements for the job named above. The client agrees to use submitted responses for requirement elicitation and analysis related to this job.
"""


def render_contract_template(job, participant):
    template = job.contract_template or DEFAULT_CONTRACT_TEMPLATE
    values = {
        '{{job_title}}': job.title,
        '{{job_description}}': job.description,
        '{{participant_name}}': participant.username,
        '{{participant_email}}': participant.email,
        '{{participant_phone}}': participant.phone_number or '',
        '{{participant_cnic}}': participant.cnic or '',
        '{{client_name}}': job.created_by.username,
        '{{client_email}}': job.created_by.email,
        '{{deadline}}': job.deadline.strftime('%Y-%m-%d') if job.deadline else 'No deadline',
    }
    for placeholder, value in values.items():
        template = template.replace(placeholder, value)
    return template


def ensure_contract_for_application(application):
    contract, _ = JobContract.objects.get_or_create(
        job=application.job,
        participant=application.participant,
        defaults={'content': render_contract_template(application.job, application.participant)}
    )
    return contract


# ─── CLIENT VIEWS ────────────────────────────────────────────

class CreateJobView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request):
        serializer = CreateJobSerializer(data=request.data)
        if serializer.is_valid():
            job = serializer.save(created_by=request.user, status='pending')
            for admin in User.objects.filter(role='admin'):
                create_notification(admin, 'job_approval', 'Job awaiting approval', f'{request.user.username} submitted "{job.title}" for approval.')
            return Response({'message': 'Job created and pending admin approval.', 'job': JobSerializer(job).data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MyJobsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request):
        jobs = Job.objects.filter(created_by=request.user)
        return Response(JobSerializer(jobs, many=True).data)

class DeleteJobView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def delete(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        job.delete()
        return Response({'message': 'Job deleted successfully.'})

class UpdateContractTemplateView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def patch(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        job.contract_template = request.data.get('contract_template', '')
        job.save(update_fields=['contract_template'])
        return Response({'message': 'Contract template saved.', 'job': JobSerializer(job).data})

class JobApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        applications = ParticipationRequest.objects.filter(job=job)
        return Response(ParticipationRequestSerializer(applications, many=True).data)

class ApproveRejectApplicationView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, application_id):
        try:
            application = ParticipationRequest.objects.get(id=application_id, job__created_by=request.user)
        except ParticipationRequest.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # 'approve' or 'reject'
        if action == 'approve':
            application.status = 'approved'
            application.save()
            contract = ensure_contract_for_application(application)
            create_notification(application.participant, 'application_status', 'Application approved', f'Your application for "{application.job.title}" was approved.')
            create_notification(application.participant, 'contract', 'Contract generated', f'A contract is ready for "{application.job.title}".')
            return Response({'message': 'Participant approved and contract generated.', 'contract': JobContractSerializer(contract).data})
        elif action == 'reject':
            application.status = 'rejected'
            application.save()
            create_notification(application.participant, 'application_status', 'Application rejected', f'Your application for "{application.job.title}" was rejected.')
            return Response({'message': 'Participant rejected.'})
        return Response({'error': 'Invalid action. Use approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)

class CreateContractView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        participant_id = request.data.get('participant_id')
        content = request.data.get('content')

        if not participant_id or not content:
            return Response({'error': 'participant_id and content are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            contract = JobContract.objects.get(job=job, participant_id=participant_id)
        except JobContract.DoesNotExist:
            contract = JobContract.objects.create(job=job, participant_id=participant_id, content=content)
            return Response({'message': 'Contract created.', 'contract': JobContractSerializer(contract).data}, status=status.HTTP_201_CREATED)

        if contract.signed:
            return Response({'error': 'Signed contracts cannot be changed.'}, status=status.HTTP_400_BAD_REQUEST)

        contract.content = content
        contract.save(update_fields=['content'])
        return Response({'message': 'Contract updated.', 'contract': JobContractSerializer(contract).data})

class UploadTrainingMaterialView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist('files')
        if files:
            title = request.data.get('title', 'Training material')
            materials = []
            for file in files:
                serializer = TrainingMaterialSerializer(data={'title': f'{title} - {file.name}', 'file': file})
                if serializer.is_valid():
                    serializer.save(job=job)
                    materials.append(serializer.data)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'Training materials uploaded.', 'materials': materials}, status=status.HTTP_201_CREATED)

        serializer = TrainingMaterialSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(job=job)
            for application in ParticipationRequest.objects.filter(job=job, status='approved').select_related('participant'):
                create_notification(application.participant, 'training', 'Training material available', f'New training material is available for "{job.title}".')
            return Response({'message': 'Training material uploaded.', 'material': serializer.data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ─── PARTICIPANT VIEWS ────────────────────────────────────────

class MyApplicationsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request):
        applications = ParticipationRequest.objects.filter(participant=request.user).select_related('job')
        return Response(ParticipationRequestSerializer(applications, many=True).data)

class MyContractsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request):
        contracts = JobContract.objects.filter(participant=request.user).select_related('job').order_by('-created_at')
        return Response(JobContractSerializer(contracts, many=True).data)

class MyTrainingMaterialsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request):
        approved_job_ids = ParticipationRequest.objects.filter(
            participant=request.user,
            status='approved',
            job__contracts__participant=request.user,
            job__contracts__signed=True,
        ).values_list('job_id', flat=True).distinct()
        materials = TrainingMaterial.objects.filter(job_id__in=approved_job_ids).select_related('job').order_by('-uploaded_at')
        return Response(TrainingMaterialSerializer(materials, many=True).data)

class AvailableJobsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request):
        jobs = Job.objects.filter(
            status='open',
            crowdsourcing_mode='external',
            deadline__gte=timezone.now()   #
        )
        return Response(JobSerializer(jobs, many=True).data)

class ApplyForJobView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, status='open')
        except Job.DoesNotExist:
            return Response({'error': 'Job not found or not open'}, status=status.HTTP_404_NOT_FOUND)

        if ParticipationRequest.objects.filter(job=job, participant=request.user).exists():
            return Response({'error': 'You have already applied for this job'}, status=status.HTTP_400_BAD_REQUEST)

        application = ParticipationRequest.objects.create(job=job, participant=request.user)
        return Response({'message': 'Application submitted successfully.'}, status=status.HTTP_201_CREATED)

class SignContractView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def post(self, request, contract_id):
        try:
            contract = JobContract.objects.get(id=contract_id, participant=request.user)
        except JobContract.DoesNotExist:
            return Response({'error': 'Contract not found'}, status=status.HTTP_404_NOT_FOUND)

        if contract.signed:
            return Response({'error': 'Contract already signed'}, status=status.HTTP_400_BAD_REQUEST)

        contract.signed = True
        contract.signed_at = timezone.now()
        contract.save()
        return Response({'message': 'Contract signed successfully.'})

class AccessTrainingView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request, job_id):
        # Check participant is approved and has signed contract
        try:
            application = ParticipationRequest.objects.get(
                job_id=job_id, participant=request.user, status='approved'
            )
        except ParticipationRequest.DoesNotExist:
            return Response({'error': 'You are not approved for this job'}, status=status.HTTP_403_FORBIDDEN)

        contract_signed = JobContract.objects.filter(
            job_id=job_id, participant=request.user, signed=True
        ).exists()
        if not contract_signed:
            return Response({'error': 'Please sign the contract first'}, status=status.HTTP_403_FORBIDDEN)

        materials = TrainingMaterial.objects.filter(job_id=job_id)
        return Response(TrainingMaterialSerializer(materials, many=True).data)

class CompleteTrainingView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def post(self, request, job_id):
        materials = TrainingMaterial.objects.filter(job_id=job_id)
        if not materials.exists():
            return Response({'error': 'No training material found'}, status=status.HTTP_404_NOT_FOUND)

        for material in materials:
            material.training_completed_by.add(request.user)
        return Response({'message': 'Training marked as complete.'})

# ─── ADMIN VIEWS ─────────────────────────────────────────────

class AdminPendingJobsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        jobs = Job.objects.filter(status='pending')
        return Response(JobSerializer(jobs, many=True).data)

class AdminApproveRejectJobView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, status='pending')
        except Job.DoesNotExist:
            return Response({'error': 'Pending job not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        reason = request.data.get('reason', '')

        if action == 'approve':
            job.status = 'open'
            job.rejection_reason = ''
            job.save(update_fields=['status', 'rejection_reason'])
            create_notification(job.created_by, 'job_approval', 'Job approved', f'Your job "{job.title}" was approved and is now open.')
            return Response({'message': 'Job approved and now open.'})
        elif action == 'reject':
            if not reason or not reason.strip():
                return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)
            job.status = 'rejected'
            job.rejection_reason = reason.strip()
            job.save(update_fields=['status', 'rejection_reason'])
            create_notification(job.created_by, 'job_rejection', 'Job rejected', f'Your job "{job.title}" was rejected. Reason: {job.rejection_reason}')
            return Response({'message': f'Job rejected. Reason: {reason}'})
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


# ─── INVITATION VIEWS ────────────────────────────────────────

class InviteParticipantView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        if job.crowdsourcing_mode != 'internal':
            return Response({'error': 'Invitations are only for internal jobs'}, status=status.HTTP_400_BAD_REQUEST)

        participant_id = request.data.get('participant_id')
        message = request.data.get('message', '')

        try:
            participant = User.objects.get(id=participant_id, role='participant')
        except User.DoesNotExist:
            return Response({'error': 'Participant not found'}, status=status.HTTP_404_NOT_FOUND)

        if Invitation.objects.filter(job=job, participant=participant).exists():
            return Response({'error': 'Participant already invited'}, status=status.HTTP_400_BAD_REQUEST)

        invitation = Invitation.objects.create(
            job=job,
            participant=participant,
            invited_by=request.user,
            message=message
        )

        create_notification(participant, 'invitation', 'New job invitation', f'{request.user.username} invited you to "{job.title}".')

        return Response({'message': f'Invitation sent to {participant.username}.'}, status=status.HTTP_201_CREATED)


class MyInvitationsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def get(self, request):
        invitations = Invitation.objects.filter(participant=request.user).select_related('job', 'invited_by')
        data = []
        for inv in invitations:
            data.append({
                'id': inv.id,
                'job': {
                    'id': inv.job.id,
                    'title': inv.job.title,
                    'description': inv.job.description,
                    'deadline': inv.job.deadline,
                },
                'invited_by': inv.invited_by.username,
                'message': inv.message,
                'status': inv.status,
                'created_at': inv.created_at,
            })
        return Response(data)


class RespondInvitationView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsParticipant]

    def post(self, request, invitation_id):
        try:
            invitation = Invitation.objects.get(id=invitation_id, participant=request.user)
        except Invitation.DoesNotExist:
            return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'accept':
            invitation.status = 'accepted'
            invitation.save()
            application, _ = ParticipationRequest.objects.get_or_create(
                job=invitation.job,
                participant=request.user,
                defaults={'status': 'approved'}
            )
            if application.status != 'approved':
                application.status = 'approved'
                application.save(update_fields=['status'])
            ensure_contract_for_application(application)
            create_notification(invitation.invited_by, 'invitation', 'Invitation accepted', f'{request.user.username} accepted your invitation to "{invitation.job.title}".')
            create_notification(request.user, 'contract', 'Contract generated', f'A contract is ready for "{invitation.job.title}".')
            return Response({'message': 'Invitation accepted! You can now proceed with the job.'})
        elif action == 'reject':
            invitation.status = 'rejected'
            invitation.save()
            # Remove participation request
            ParticipationRequest.objects.filter(job=invitation.job, participant=request.user).delete()
            create_notification(invitation.invited_by, 'invitation', 'Invitation rejected', f'{request.user.username} rejected your invitation to "{invitation.job.title}".')
            return Response({'message': 'Invitation rejected.'})

        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


class JobInvitationsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved, IsClient]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id, created_by=request.user)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        invitations = Invitation.objects.filter(job=job).select_related('participant')
        data = []
        for inv in invitations:
            data.append({
                'id': inv.id,
                'participant': {
                    'id': inv.participant.id,
                    'username': inv.participant.username,
                    'email': inv.participant.email,
                },
                'message': inv.message,
                'status': inv.status,
                'created_at': inv.created_at,
            })
        return Response(data)
