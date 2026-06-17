from django.urls import path
from .views import RunNLPView, GetNLPResultView

urlpatterns = [
    path('jobs/<int:job_id>/run/', RunNLPView.as_view(), name='run-nlp'),
    path('jobs/<int:job_id>/result/', GetNLPResultView.as_view(), name='get-nlp-result'),
]