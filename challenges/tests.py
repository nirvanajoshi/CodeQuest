from django.test import TestCase
from django.urls import reverse

from courses.models import Course, Lesson

from .models import Challenge


class ChallengeListTests(TestCase):
    def setUp(self):
        course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        lesson = Lesson.objects.create(course=course, title="Variables")
        Challenge.objects.create(
            title="Sum Two Numbers", slug="sum-two-numbers", description="d",
            points=10, difficulty="easy", lesson=lesson, is_published=True,
        )
        Challenge.objects.create(
            title="Binary Search", slug="binary-search", description="d",
            points=20, difficulty="hard", lesson=lesson, is_published=True,
        )
        Challenge.objects.create(
            title="Draft Challenge", slug="draft", description="d",
            points=5, lesson=lesson, is_published=False,
        )

    def test_unpublished_challenge_is_hidden(self):
        response = self.client.get(reverse("challenge_list"))
        titles = [c.title for c in response.context["page_obj"]]
        self.assertNotIn("Draft Challenge", titles)

    def test_search_by_title(self):
        response = self.client.get(reverse("challenge_list"), {"q": "Binary"})
        titles = [c.title for c in response.context["page_obj"]]
        self.assertEqual(titles, ["Binary Search"])

    def test_filter_by_difficulty(self):
        response = self.client.get(reverse("challenge_list"), {"difficulty": "hard"})
        titles = [c.title for c in response.context["page_obj"]]
        self.assertEqual(titles, ["Binary Search"])

    def test_unpublished_challenge_detail_404s(self):
        response = self.client.get(reverse("challenge_detail", args=["draft"]))
        self.assertEqual(response.status_code, 404)
