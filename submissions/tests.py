import shutil

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from challenges.models import Challenge, TestCase as ChallengeTestCase
from courses.models import Course, Lesson

from .grading import LanguageUnavailable, RUNNERS, grade_submission
from .models import Submission


class GradingTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        lesson = Lesson.objects.create(course=course, title="Variables")
        self.challenge = Challenge.objects.create(
            title="Sum Two Numbers", slug="sum-two-numbers", description="Add them.",
            points=10, lesson=lesson, is_published=True,
        )
        ChallengeTestCase.objects.create(
            challenge=self.challenge, input_data="2 3", expected_output="5",
            is_hidden=False, time_limit=1.0,
        )
        ChallengeTestCase.objects.create(
            challenge=self.challenge, input_data="10 20", expected_output="30",
            is_hidden=True, time_limit=1.0,
        )
        self.user = User.objects.create_user(username="grader", password="pw12345!")

    def _submission(self, source_code, language=Submission.Language.PYTHON):
        return Submission.objects.create(
            user=self.user, challenge=self.challenge, language=language, source_code=source_code,
        )

    def test_correct_solution_is_accepted(self):
        submission = self._submission("a, b = map(int, input().split())\nprint(a + b)")
        grade_submission(submission)
        self.assertEqual(submission.status, Submission.Status.ACCEPTED)
        self.assertEqual(submission.score, 10)
        self.assertIn("Passed", submission.feedback)

    def test_wrong_answer_gives_partial_credit(self):
        submission = self._submission("input()\nprint(5)")
        grade_submission(submission)
        self.assertEqual(submission.status, Submission.Status.WRONG_ANSWER)
        self.assertEqual(submission.score, 5)

    def test_runtime_error_is_reported(self):
        submission = self._submission("raise ValueError('boom')")
        grade_submission(submission)
        self.assertEqual(submission.status, Submission.Status.RUNTIME_ERROR)
        self.assertEqual(submission.score, 0)
        self.assertIn("ValueError", submission.feedback)

    def test_time_limit_exceeded(self):
        ChallengeTestCase.objects.all().delete()
        ChallengeTestCase.objects.create(
            challenge=self.challenge, input_data="", expected_output="", time_limit=0.3,
        )
        submission = self._submission("import time\ntime.sleep(3)")
        grade_submission(submission)
        self.assertEqual(submission.status, Submission.Status.TIME_LIMIT)

    def test_hidden_test_case_feedback_omits_details(self):
        submission = self._submission("input()\nprint(5)")
        grade_submission(submission)
        self.assertNotIn("30", submission.feedback)

    def test_unsupported_language_runner_raises(self):
        with self.assertRaises(LanguageUnavailable):
            RUNNERS[Submission.Language.JAVA]("code", "input", 1.0)

    def test_no_test_cases_is_not_silently_accepted(self):
        ChallengeTestCase.objects.all().delete()
        submission = self._submission("print('anything')")
        grade_submission(submission)
        self.assertEqual(submission.status, Submission.Status.RUNTIME_ERROR)
        self.assertEqual(submission.score, 0)


class JavaScriptGradingTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="JS Basics", slug="js-basics", is_published=True)
        lesson = Lesson.objects.create(course=course, title="Intro")
        self.challenge = Challenge.objects.create(
            title="Add", slug="add", description="Add.", points=10, lesson=lesson, is_published=True,
        )
        ChallengeTestCase.objects.create(
            challenge=self.challenge, input_data="2 3", expected_output="5", time_limit=3.0,
        )
        self.user = User.objects.create_user(username="jsgrader", password="pw12345!")

    def test_correct_javascript_solution_is_accepted(self):
        if shutil.which("node") is None:
            self.skipTest("node is not installed in this environment")
        submission = Submission.objects.create(
            user=self.user, challenge=self.challenge, language=Submission.Language.JAVASCRIPT,
            source_code=(
                "const l = require('fs').readFileSync(0, 'utf8').trim().split(' ').map(Number);\n"
                "console.log(l[0] + l[1]);"
            ),
        )
        grade_submission(submission)
        self.assertEqual(submission.status, Submission.Status.ACCEPTED)


class SubmitViewTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        lesson = Lesson.objects.create(course=course, title="Variables")
        self.challenge = Challenge.objects.create(
            title="Sum Two Numbers", slug="sum-two-numbers", description="Add them.",
            points=10, lesson=lesson, is_published=True,
        )
        ChallengeTestCase.objects.create(
            challenge=self.challenge, input_data="2 3", expected_output="5", time_limit=1.0,
        )
        self.user = User.objects.create_user(username="submitter", password="pw12345!")
        self.client.force_login(self.user)

    def test_submit_creates_graded_submission(self):
        response = self.client.post(
            reverse("submit_solution", args=["sum-two-numbers"]),
            {"language": "python", "source_code": "a, b = map(int, input().split())\nprint(a + b)"},
        )
        submission = Submission.objects.get(user=self.user, challenge=self.challenge)
        self.assertRedirects(response, reverse("submission_detail", args=[submission.pk]))
        self.assertEqual(submission.status, Submission.Status.ACCEPTED)

    def test_other_user_cannot_view_submission(self):
        submission = Submission.objects.create(
            user=self.user, challenge=self.challenge, language="python", source_code="print(5)",
        )
        other = User.objects.create_user(username="other", password="pw12345!")
        self.client.force_login(other)
        response = self.client.get(reverse("submission_detail", args=[submission.pk]))
        self.assertEqual(response.status_code, 404)

    def test_anonymous_user_redirected_to_login(self):
        self.client.logout()
        response = self.client.get(reverse("submit_solution", args=["sum-two-numbers"]))
        self.assertEqual(response.status_code, 302)
