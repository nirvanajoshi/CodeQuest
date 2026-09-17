import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from challenges.models import Challenge, TestCase as ChallengeTestCase
from courses.models import Course, Lesson
from quizzes.models import Question, Quiz, QuizAnswer, QuizAttempt
from submissions.models import Submission

from .models import Badge, UserBadge, XPTransaction
from .services import record_quiz_attempt, record_solve


class RecordSolveTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        lesson = Lesson.objects.create(course=course, title="Variables")
        self.challenge = Challenge.objects.create(
            title="Sum", slug="sum", description="Add.", points=10, lesson=lesson, is_published=True,
        )
        self.user = User.objects.create_user(username="solver", password="pw12345!")

    def _accept_submission(self):
        return Submission.objects.create(
            user=self.user, challenge=self.challenge, language="python",
            source_code="print(5)", status=Submission.Status.ACCEPTED, score=10,
        )

    def test_xp_awarded_once_per_challenge(self):
        self._accept_submission()
        record_solve(self.user, self.challenge)
        self._accept_submission()
        record_solve(self.user, self.challenge)

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.total_xp, 10)
        self.assertEqual(XPTransaction.objects.filter(user=self.user).count(), 1)

    def test_first_steps_badge_awarded_at_one_solve(self):
        Badge.objects.get_or_create(
            name="First Steps",
            defaults={"requirement_type": "challenges_solved", "requirement_value": 1},
        )
        self._accept_submission()
        record_solve(self.user, self.challenge)
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge__name="First Steps").exists()
        )

    def test_streak_increments_on_consecutive_days_and_resets_on_gap(self):
        profile = self.user.profile
        today = datetime.date.today()

        profile.last_activity_date = today - datetime.timedelta(days=1)
        profile.current_streak = 3
        profile.save()
        self._accept_submission()
        record_solve(self.user, self.challenge)
        profile.refresh_from_db()
        self.assertEqual(profile.current_streak, 4)

        profile.last_activity_date = today - datetime.timedelta(days=5)
        profile.save()
        self._accept_submission()
        record_solve(self.user, self.challenge)
        profile.refresh_from_db()
        self.assertEqual(profile.current_streak, 1)

    def test_same_day_solve_does_not_double_increment_streak(self):
        profile = self.user.profile
        profile.last_activity_date = datetime.date.today()
        profile.current_streak = 2
        profile.save()
        self._accept_submission()
        record_solve(self.user, self.challenge)
        profile.refresh_from_db()
        self.assertEqual(profile.current_streak, 2)


class RecordQuizAttemptTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="Python Basics", slug="python-basics-2", is_published=True)
        self.quiz = Quiz.objects.create(
            title="Quiz", course=course, time_limit=10, passing_score=70, is_published=True,
        )
        self.question = Question.objects.create(
            quiz=self.quiz, question_text="2+2?", option_a="3", option_b="4",
            option_c="5", option_d="6", correct_option="b", points=10,
        )
        self.user = User.objects.create_user(username="quizzer", password="pw12345!")
        Badge.objects.get_or_create(
            name="Quiz Master",
            defaults={"requirement_type": "quiz_score", "requirement_value": 90},
        )

    def _completed_attempt(self, score, correct):
        attempt = QuizAttempt.objects.create(
            user=self.user, quiz=self.quiz, score=score, completed_at=timezone.now(),
        )
        QuizAnswer.objects.create(
            attempt=attempt, question=self.question,
            selected_option="b" if correct else "a", is_correct=correct,
        )
        return attempt

    def test_quiz_master_badge_awarded_at_high_score(self):
        attempt = self._completed_attempt(score=100, correct=True)
        record_quiz_attempt(self.user, attempt)
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge__name="Quiz Master").exists()
        )

    def test_no_badge_below_threshold(self):
        attempt = self._completed_attempt(score=50, correct=False)
        record_quiz_attempt(self.user, attempt)
        self.assertFalse(
            UserBadge.objects.filter(user=self.user, badge__name="Quiz Master").exists()
        )

    def test_xp_awarded_for_correct_answers_on_first_completion(self):
        attempt = self._completed_attempt(score=100, correct=True)
        record_quiz_attempt(self.user, attempt)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.total_xp, 10)
