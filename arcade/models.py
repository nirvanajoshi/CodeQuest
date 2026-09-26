from django.conf import settings
from django.db import models


class ArcadeAttempt(models.Model):
    class Game(models.TextChoices):
        SNAKE = "snake", "Snake"
        MINESWEEPER = "minesweeper", "Minesweeper"
        MEMORY_MATCH = "memory_match", "Memory Match"
        REACTION_TIME = "reaction_time", "Reaction Time"
        ARCHERY = "archery", "Archery"
        CHESS = "chess", "Chess"
        CAR_RACING = "car_racing", "Car Racing"
        BOUNCE = "bounce", "Bounce"
        BREAKOUT = "breakout", "Breakout"
        PONG = "pong", "Pong"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="arcade_attempts"
    )
    game = models.CharField(max_length=20, choices=Game.choices)
    score = models.PositiveIntegerField(help_text="Higher is always better, across every game.")
    detail = models.CharField(
        max_length=100, blank=True, help_text="Human-readable summary, e.g. '14 food, length 17'."
    )
    duration_seconds = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.game} - {self.score}"
