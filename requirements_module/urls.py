from django.urls import path
from .views import (
    CreateRequirementFormView,ClientGetFormView, ListFormsView, PublishFormView,
    FormSubmissionsView, ListPublishedFormsView, ViewFormView,
    RequirementSubmissionStatusView, SubmitRequirementsView, MySubmittedFormsView
)


urlpatterns = [
    # Client
    path('jobs/<int:job_id>/forms/create/', CreateRequirementFormView.as_view(), name='create-form'),
    path('jobs/<int:job_id>/forms/', ListFormsView.as_view(), name='list-forms'),
    path('jobs/<int:job_id>/forms/<int:form_id>/publish/', PublishFormView.as_view(), name='publish-form'),
    path('jobs/<int:job_id>/forms/<int:form_id>/submissions/', FormSubmissionsView.as_view(), name='form-submissions'),
    path('jobs/<int:job_id>/forms/<int:form_id>/detail/', ClientGetFormView.as_view(), name='client-get-form'),

    # Participant
    path('submissions/my/', MySubmittedFormsView.as_view(), name='my-submitted-forms'),
    path('jobs/<int:job_id>/forms/published/', ListPublishedFormsView.as_view(), name='list-published-forms'),
    path('jobs/<int:job_id>/forms/<int:form_id>/submission-status/', RequirementSubmissionStatusView.as_view(), name='submission-status'),
    path('jobs/<int:job_id>/forms/<int:form_id>/', ViewFormView.as_view(), name='view-form'),
    path('jobs/<int:job_id>/forms/<int:form_id>/submit/', SubmitRequirementsView.as_view(), name='submit-requirements'),
]
