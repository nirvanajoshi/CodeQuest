import datetime

from django.conf import settings
from django.db import models

from challenges.models import Challenge


class DailyChallenge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_challenges"
    )
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name="daily_challenge_assignments")
    assigned_on = models.DateField(default=datetime.date.today)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    xp_awarded = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assigned_on"]
        unique_together = ("user", "assigned_on")

    def __str__(self):
        return f"{self.user} - {self.challenge.title} ({self.assigned_on})"


class Badge(models.Model):
    class RequirementType(models.TextChoices):
        CHALLENGES_SOLVED = "challenges_solved", "Challenges solved"
        STREAK_DAYS = "streak_days", "Streak (days)"
        QUIZ_SCORE = "quiz_score", "Quiz score (%)"
        TYPING_WPM = "typing_wpm", "Typing speed (WPM)"

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True, help_text="Emoji or icon identifier")
    requirement_type = models.CharField(max_length=30, choices=RequirementType.choices)
    requirement_value = models.PositiveIntegerField()

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="badges"
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="awarded_to")
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "badge")
        ordering = ["-earned_at"]

    def __str__(self):
        return f"{self.user} - {self.badge.name}"


class XPTransaction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="xp_transactions"
    )
    amount = models.IntegerField()
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} {self.amount:+d} ({self.reason})"
