from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from jobs.permissions import IsApproved
from .models import Profile, Experience, Education, Project, Skill
from .serializers import (ProfileSerializer, ExperienceSerializer,
    EducationSerializer, ProjectSerializer, SkillSerializer)

def get_or_create_profile(user):
    profile, created = Profile.objects.get_or_create(user=user)
    return profile

# ─── MY PROFILE ──────────────────────────────────────────────

class MyProfileView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(ProfileSerializer(profile, context={'request': request}).data)

    def put(self, request):
        profile = get_or_create_profile(request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ProfileSerializer(profile, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ─── VIEW ANY PROFILE (for client to view participant profiles) ──

class ViewProfileView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request, user_id):
        try:
            profile = Profile.objects.get(user__id=user_id)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProfileSerializer(profile, context={'request': request}).data)

# ─── EXPERIENCE ──────────────────────────────────────────────

class ExperienceView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(ExperienceSerializer(profile.experiences.all(), many=True).data)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = ExperienceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profile=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExperienceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def put(self, request, exp_id):
        try:
            exp = Experience.objects.get(id=exp_id, profile__user=request.user)
        except Experience.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ExperienceSerializer(exp, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, exp_id):
        try:
            exp = Experience.objects.get(id=exp_id, profile__user=request.user)
        except Experience.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        exp.delete()
        return Response({'message': 'Deleted.'})

# ─── EDUCATION ───────────────────────────────────────────────

class EducationView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(EducationSerializer(profile.education.all(), many=True).data)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = EducationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profile=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EducationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def put(self, request, edu_id):
        try:
            edu = Education.objects.get(id=edu_id, profile__user=request.user)
        except Education.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EducationSerializer(edu, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, edu_id):
        try:
            edu = Education.objects.get(id=edu_id, profile__user=request.user)
        except Education.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        edu.delete()
        return Response({'message': 'Deleted.'})

# ─── PROJECTS ────────────────────────────────────────────────

class ProjectView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(ProjectSerializer(profile.projects.all(), many=True).data)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profile=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def put(self, request, proj_id):
        try:
            proj = Project.objects.get(id=proj_id, profile__user=request.user)
        except Project.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProjectSerializer(proj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, proj_id):
        try:
            proj = Project.objects.get(id=proj_id, profile__user=request.user)
        except Project.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        proj.delete()
        return Response({'message': 'Deleted.'})

# ─── SKILLS ──────────────────────────────────────────────────

class SkillView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(SkillSerializer(profile.skills.all(), many=True).data)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = SkillSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profile=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SkillDetailView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def delete(self, request, skill_id):
        try:
            skill = Skill.objects.get(id=skill_id, profile__user=request.user)
        except Skill.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        skill.delete()
        return Response({'message': 'Deleted.'})

# ─── LIST PARTICIPANTS (for client to browse and invite) ──────

class ListParticipantsView(APIView):
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        from users.models import User
        participants = User.objects.filter(role='participant', is_approved=True)
        data = []
        for p in participants:
            try:
                profile = p.profile
                data.append(ProfileSerializer(profile, context={'request': request}).data)
            except Profile.DoesNotExist:
                data.append({'user_id': p.id, 'username': p.username, 'email': p.email})
        return Response(data)
