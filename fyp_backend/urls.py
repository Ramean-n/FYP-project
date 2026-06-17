from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/requirements/', include('requirements_module.urls')),
    path('api/nlp/', include('nlp_engine.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/profiles/', include('profiles.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)