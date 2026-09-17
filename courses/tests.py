from django.test import TestCase
from django.urls import reverse

from challenges.models import Challenge

from .models import Course, Lesson


class CourseListTests(TestCase):
    def test_unpublished_courses_are_hidden(self):
        Course.objects.create(title="Visible", slug="visible", is_published=True)
        Course.objects.create(title="Hidden", slug="hidden", is_published=False)

        response = self.client.get(reverse("course_list"))
        titles = [c.title for c in response.context["page_obj"]]
        self.assertIn("Visible", titles)
        self.assertNotIn("Hidden", titles)


class LessonDetailTests(TestCase):
    def setUp(self):
        self.course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        self.lesson = Lesson.objects.create(course=self.course, title="Variables", content="Variables store data.")

    def test_lesson_content_is_rendered(self):
        response = self.client.get(reverse("lesson_detail", args=[self.course.slug, self.lesson.pk]))
        self.assertContains(response, "Variables store data.")

    def test_only_published_challenges_are_listed(self):
        Challenge.objects.create(
            title="Visible", slug="visible", description="d", points=1,
            lesson=self.lesson, is_published=True,
        )
        Challenge.objects.create(
            title="Hidden", slug="hidden", description="d", points=1,
            lesson=self.lesson, is_published=False,
        )
        response = self.client.get(reverse("lesson_detail", args=[self.course.slug, self.lesson.pk]))
        self.assertContains(response, "Visible")
        self.assertNotContains(response, "Hidden")
