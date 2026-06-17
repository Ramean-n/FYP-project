from django.urls import path
from .views import (
    MyProfileView, ViewProfileView,
    ExperienceView, ExperienceDetailView,
    EducationView, EducationDetailView,
    ProjectView, ProjectDetailView,
    SkillView, SkillDetailView,
    ListParticipantsView
)

urlpatterns = [
    path('me/', MyProfileView.as_view(), name='my-profile'),
    path('participants/', ListParticipantsView.as_view(), name='list-participants'),
    path('<int:user_id>/', ViewProfileView.as_view(), name='view-profile'),
    path('experience/', ExperienceView.as_view(), name='experience'),
    path('experience/<int:exp_id>/', ExperienceDetailView.as_view(), name='experience-detail'),
    path('education/', EducationView.as_view(), name='education'),
    path('education/<int:edu_id>/', EducationDetailView.as_view(), name='education-detail'),
    path('projects/', ProjectView.as_view(), name='projects'),
    path('projects/<int:proj_id>/', ProjectDetailView.as_view(), name='project-detail'),
    path('skills/', SkillView.as_view(), name='skills'),
    path('skills/<int:skill_id>/', SkillDetailView.as_view(), name='skill-detail'),
]