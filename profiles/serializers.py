from rest_framework import serializers
from .models import Profile, Experience, Education, Project, Skill

class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = '__all__'
        read_only_fields = ['profile']

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'
        read_only_fields = ['profile']

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['profile']

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'
        read_only_fields = ['profile']

class ProfileSerializer(serializers.ModelSerializer):
    experiences = ExperienceSerializer(many=True, read_only=True)
    education = EducationSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        picture = obj.profile_picture or obj.user.profile_picture
        if not picture:
            return None
        request = self.context.get('request')
        url = picture.url
        return request.build_absolute_uri(url) if request else url

    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ['user', 'profile_picture', 'created_at', 'updated_at']
