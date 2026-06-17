from django.db import models
from users.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class Experience(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='experiences')
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    currently_working = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.title} at {self.company}"

class Education(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='education')
    degree = models.CharField(max_length=200)
    institution = models.CharField(max_length=200)
    field_of_study = models.CharField(max_length=200, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    currently_studying = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.degree} at {self.institution}"

class Project(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=200)
    description = models.TextField()
    url = models.URLField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.title

class Skill(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=50, choices=[
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ], default='intermediate')

    def __str__(self):
        return self.name