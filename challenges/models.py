from django.db import models

from courses.models import Lesson


class Challenge(models.Model):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    difficulty = models.CharField(
        max_length=20, choices=Difficulty.choices, default=Difficulty.EASY
    )
    points = models.PositiveIntegerField(default=0)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="challenges")
    input_format = models.TextField(blank=True)
    output_format = models.TextField(blank=True)
    constraints = models.TextField(blank=True)
    sample_input = models.TextField(blank=True)
    sample_output = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class TestCase(models.Model):
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="test_cases"
    )
    input_data = models.TextField()
    expected_output = models.TextField()
    is_hidden = models.BooleanField(default=True)
    time_limit = models.FloatField(default=1.0, help_text="Seconds")
    memory_limit = models.PositiveIntegerField(default=256, help_text="Megabytes")

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"TestCase for {self.challenge.title}"
