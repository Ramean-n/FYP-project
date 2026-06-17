from rest_framework import serializers
from .models import Job, ParticipationRequest, JobContract, TrainingMaterial
from users.serializers import UserSerializer

class JobSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['created_by', 'status', 'created_at']

class CreateJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['title', 'description', 'crowdsourcing_mode', 'deadline', 'contract_template']

class JobContractSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    participant_name = serializers.CharField(source='participant.username', read_only=True)
    participant_email = serializers.CharField(source='participant.email', read_only=True)

    class Meta:
        model = JobContract
        fields = '__all__'
        read_only_fields = ['signed', 'signed_at', 'created_at']

class ParticipationRequestSerializer(serializers.ModelSerializer):
    participant = UserSerializer(read_only=True)
    job = JobSerializer(read_only=True)
    contract = serializers.SerializerMethodField()  # ← add this

    class Meta:
        model = ParticipationRequest
        fields = '__all__'
        read_only_fields = ['participant', 'status', 'applied_at']

    def get_contract(self, obj):  # ← add this
        try:
            contract = JobContract.objects.get(job=obj.job, participant=obj.participant)
            return JobContractSerializer(contract).data
        except JobContract.DoesNotExist:
            return None

class TrainingMaterialSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)

    class Meta:
        model = TrainingMaterial
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'job']
