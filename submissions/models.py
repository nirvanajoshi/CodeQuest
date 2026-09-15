from django.conf import settings
from django.db import models

from challenges.models import Challenge


class Submission(models.Model):
    class Language(models.TextChoices):
        PYTHON = "python", "Python"
        JAVASCRIPT = "javascript", "JavaScript"
        JAVA = "java", "Java"
        CPP = "cpp", "C++"
        C = "c", "C"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        WRONG_ANSWER = "wrong_answer", "Wrong Answer"
        RUNTIME_ERROR = "runtime_error", "Runtime Error"
        TIME_LIMIT = "time_limit", "Time Limit Exceeded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions"
    )
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="submissions"
    )
    language = models.CharField(max_length=20, choices=Language.choices)
    source_code = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    score = models.PositiveIntegerField(default=0)
    execution_time = models.FloatField(null=True, blank=True, help_text="Seconds")
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.user} - {self.challenge.title} ({self.status})"
