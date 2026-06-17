from django.urls import path
from .views import GenerateReportView, GetReportView, ExportReportView

urlpatterns = [
    path('jobs/<int:job_id>/generate/', GenerateReportView.as_view(), name='generate-report'),
    path('jobs/<int:job_id>/', GetReportView.as_view(), name='get-report'),
    path('jobs/<int:job_id>/export/<str:export_format>/', ExportReportView.as_view(), name='export-report'),
]
