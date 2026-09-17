from django.conf import settings
from django.db import models

from courses.models import Course


class Quiz(models.Model):
    title = models.CharField(max_length=255)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="quizzes")
    description = models.TextField(blank=True)
    time_limit = models.PositiveIntegerField(help_text="Minutes")
    passing_score = models.PositiveIntegerField(help_text="Minimum percentage required to pass")
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class Question(models.Model):
    OPTION_CHOICES = [
        ("a", "A"),
        ("b", "B"),
        ("c", "C"),
        ("d", "D"),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    question_text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=OPTION_CHOICES)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.question_text[:50]

    def option_text(self, letter):
        return getattr(self, f"option_{letter}")

    @property
    def correct_answer_text(self):
        return self.option_text(self.correct_option)


class QuizAttempt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    score = models.PositiveIntegerField(default=0, help_text="Percentage score")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.user} - {self.quiz.title} ({self.score}%)"

    @property
    def passed(self):
        return self.completed_at is not None and self.score >= self.quiz.passing_score


class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1, choices=Question.OPTION_CHOICES)
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ("attempt", "question")

    def __str__(self):
        return f"{self.attempt} - Q{self.question_id}"

    @property
    def selected_option_text(self):
        return self.question.option_text(self.selected_option)
