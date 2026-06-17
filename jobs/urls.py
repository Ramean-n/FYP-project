from django.urls import path

from .views import (
    AccessTrainingView,
    AdminApproveRejectJobView,
    AdminPendingJobsView,
    ApplyForJobView,
    ApproveRejectApplicationView,
    AvailableJobsView,
    CompleteTrainingView,
    CreateContractView,
    CreateJobView,
    DeleteJobView,
    InviteParticipantView,
    JobApplicationsView,
    JobInvitationsView,
    MyApplicationsView,
    MyContractsView,
    MyInvitationsView,
    MyJobsView,
    MyTrainingMaterialsView,
    RespondInvitationView,
    SignContractView,
    UpdateContractTemplateView,
    UploadTrainingMaterialView,
)

urlpatterns = [
    # Client
    path('create/', CreateJobView.as_view(), name='create-job'),
    path('my-jobs/', MyJobsView.as_view(), name='my-jobs'),
    path('<int:job_id>/delete/', DeleteJobView.as_view(), name='delete-job'),
    path('<int:job_id>/contract-template/', UpdateContractTemplateView.as_view(), name='update-contract-template'),
    path('<int:job_id>/applications/', JobApplicationsView.as_view(), name='job-applications'),
    path('applications/<int:application_id>/decide/', ApproveRejectApplicationView.as_view(), name='decide-application'),
    path('<int:job_id>/contract/create/', CreateContractView.as_view(), name='create-contract'),
    path('<int:job_id>/training/upload/', UploadTrainingMaterialView.as_view(), name='upload-training'),
    path('<int:job_id>/invite/', InviteParticipantView.as_view(), name='invite-participant'),
    path('<int:job_id>/invitations/', JobInvitationsView.as_view(), name='job-invitations'),

    # Participant
    path('available/', AvailableJobsView.as_view(), name='available-jobs'),
    path('<int:job_id>/apply/', ApplyForJobView.as_view(), name='apply-job'),
    path('my-applications/', MyApplicationsView.as_view(), name='my-applications'),
    path('contracts/my/', MyContractsView.as_view(), name='my-contracts'),
    path('training/my/', MyTrainingMaterialsView.as_view(), name='my-training-materials'),
    path('contracts/<int:contract_id>/sign/', SignContractView.as_view(), name='sign-contract'),
    path('<int:job_id>/training/', AccessTrainingView.as_view(), name='access-training'),
    path('<int:job_id>/training/complete/', CompleteTrainingView.as_view(), name='complete-training'),
    path('invitations/my/', MyInvitationsView.as_view(), name='my-invitations'),
    path('invitations/<int:invitation_id>/respond/', RespondInvitationView.as_view(), name='respond-invitation'),

    # Admin
    path('admin/pending/', AdminPendingJobsView.as_view(), name='admin-pending-jobs'),
    path('admin/<int:job_id>/decide/', AdminApproveRejectJobView.as_view(), name='admin-decide-job'),
]
