from django.conf import settings
from django.db import models


class TypingText(models.Model):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    title = models.CharField(max_length=255)
    body = models.TextField(help_text="The passage the player types.")
    difficulty = models.CharField(
        max_length=20, choices=Difficulty.choices, default=Difficulty.EASY
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["difficulty", "title"]

    def __str__(self):
        return self.title


class TypingAttempt(models.Model):
    class Mode(models.TextChoices):
        CLASSIC = "classic", "Classic Sprint"
        CAR_RACE = "car_race", "Car Race"
        BATTLE = "battle", "Boss Battle"
        ROCKET = "rocket", "Rocket Launch"
        WORD_RAIN = "word_rain", "Word Rain"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="typing_attempts"
    )
    text = models.ForeignKey(
        TypingText, on_delete=models.SET_NULL, null=True, blank=True, related_name="attempts"
    )
    mode = models.CharField(max_length=20, choices=Mode.choices)
    wpm = models.PositiveIntegerField()
    accuracy = models.PositiveIntegerField(help_text="Percent, 0-100")
    duration_seconds = models.FloatField()
    outcome = models.CharField(
        max_length=20,
        blank=True,
        help_text="e.g. 'won'/'lost' for Car Race, Boss Battle, Rocket Launch and Word Rain.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.mode} - {self.wpm}wpm"
