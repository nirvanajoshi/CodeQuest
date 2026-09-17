from django.conf import settings
from django.db import models
from django.utils import timezone

from challenges.models import Challenge


class Competition(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        ONGOING = "ongoing", "Ongoing"
        COMPLETED = "completed", "Completed"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="competitions_created",
    )

    class Meta:
        ordering = ["-start_time"]

    def __str__(self):
        return self.title

    @property
    def status(self):
        """Computed live from start/end times rather than stored, so it can
        never go stale relative to the clock."""
        now = timezone.now()
        if now < self.start_time:
            return self.Status.UPCOMING
        if now > self.end_time:
            return self.Status.COMPLETED
        return self.Status.ONGOING

    def is_registration_open(self):
        return self.status != self.Status.COMPLETED


class CompetitionChallenge(models.Model):
    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="competition_challenges"
    )
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    points = models.PositiveIntegerField(help_text="Points awarded for this challenge in this competition")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        unique_together = ("competition", "challenge")

    def __str__(self):
        return f"{self.competition.title} - {self.challenge.title}"


class CompetitionRegistration(models.Model):
    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="registrations"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="competition_registrations",
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("competition", "user")

    def __str__(self):
        return f"{self.user} - {self.competition.title}"
