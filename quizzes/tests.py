from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from courses.models import Course

from .models import Question, Quiz, QuizAttempt


class QuizTakeFlowTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        self.quiz = Quiz.objects.create(
            title="Fundamentals", course=course, time_limit=10, passing_score=70, is_published=True,
        )
        self.q1 = Question.objects.create(
            quiz=self.quiz, order=1, question_text="2+2?",
            option_a="3", option_b="4", option_c="5", option_d="6", correct_option="b", points=1,
        )
        self.q2 = Question.objects.create(
            quiz=self.quiz, order=2, question_text="Capital of France?",
            option_a="Berlin", option_b="Madrid", option_c="Paris", option_d="Rome",
            correct_option="c", points=1,
        )
        self.user = User.objects.create_user(username="taker", password="pw12345!")
        self.client.force_login(self.user)

    def test_get_take_page_creates_incomplete_attempt(self):
        self.client.get(reverse("quiz_take", args=[self.quiz.pk]))
        self.assertEqual(
            QuizAttempt.objects.filter(user=self.user, completed_at__isnull=True).count(), 1
        )

    def test_submitting_all_correct_answers_scores_100(self):
        self.client.get(reverse("quiz_take", args=[self.quiz.pk]))
        attempt = QuizAttempt.objects.get(user=self.user)

        response = self.client.post(
            reverse("quiz_take", args=[self.quiz.pk]),
            {
                "attempt_id": attempt.pk,
                f"question_{self.q1.id}": "b",
                f"question_{self.q2.id}": "c",
            },
        )
        attempt.refresh_from_db()
        self.assertRedirects(response, reverse("quiz_result", args=[attempt.pk]))
        self.assertEqual(attempt.score, 100)
        self.assertTrue(attempt.passed)

    def test_partial_answers_score_proportionally(self):
        self.client.get(reverse("quiz_take", args=[self.quiz.pk]))
        attempt = QuizAttempt.objects.get(user=self.user)

        self.client.post(
            reverse("quiz_take", args=[self.quiz.pk]),
            {
                "attempt_id": attempt.pk,
                f"question_{self.q1.id}": "b",
                f"question_{self.q2.id}": "a",
            },
        )
        attempt.refresh_from_db()
        self.assertEqual(attempt.score, 50)
        self.assertFalse(attempt.passed)

    def test_completed_attempt_cannot_be_resubmitted(self):
        self.client.get(reverse("quiz_take", args=[self.quiz.pk]))
        attempt = QuizAttempt.objects.get(user=self.user)
        self.client.post(
            reverse("quiz_take", args=[self.quiz.pk]),
            {"attempt_id": attempt.pk, f"question_{self.q1.id}": "b", f"question_{self.q2.id}": "c"},
        )

        response = self.client.post(
            reverse("quiz_take", args=[self.quiz.pk]),
            {"attempt_id": attempt.pk, f"question_{self.q1.id}": "b", f"question_{self.q2.id}": "c"},
        )
        self.assertEqual(response.status_code, 404)

    def test_other_user_cannot_view_attempt_result(self):
        self.client.get(reverse("quiz_take", args=[self.quiz.pk]))
        attempt = QuizAttempt.objects.get(user=self.user)
        attempt.completed_at = attempt.started_at
        attempt.save()

        other = User.objects.create_user(username="stranger", password="pw12345!")
        self.client.force_login(other)
        response = self.client.get(reverse("quiz_result", args=[attempt.pk]))
        self.assertEqual(response.status_code, 404)
