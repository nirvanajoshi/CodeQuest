from django.contrib.auth.models import User
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

    def test_instructor_sees_lesson_edit_link(self):
        instructor = User.objects.create_user(username="teacher", password="password")
        self.course.instructor = instructor
        self.course.save()
        self.client.force_login(instructor)

        response = self.client.get(
            reverse("lesson_detail", args=[self.course.slug, self.lesson.pk])
        )

        self.assertContains(response, "Lesson instructions")
        self.assertContains(
            response,
            reverse("lesson_edit", args=[self.course.slug, self.lesson.pk]),
        )


class LessonAuthoringTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username="teacher", password="password"
        )
        self.course = Course.objects.create(
            title="Python Basics",
            slug="python-basics",
            instructor=self.instructor,
        )
        self.client.force_login(self.instructor)

    def test_instructor_can_create_lesson(self):
        response = self.client.post(
            reverse("lesson_create", args=[self.course.slug]),
            {
                "title": "Variables",
                "content": "A variable stores a value.",
                "order": 1,
                "estimated_minutes": 5,
            },
        )

        lesson = Lesson.objects.get(course=self.course)
        self.assertRedirects(
            response,
            reverse("lesson_edit", args=[self.course.slug, lesson.pk]),
        )
        self.assertEqual(lesson.content, "A variable stores a value.")

    def test_instructor_can_update_lesson_content(self):
        lesson = Lesson.objects.create(
            course=self.course,
            title="Variables",
            content="Old instructions",
        )

        response = self.client.post(
            reverse("lesson_edit", args=[self.course.slug, lesson.pk]),
            {
                "title": "Variables",
                "content": "Updated instructions",
                "order": 1,
                "estimated_minutes": 8,
            },
        )

        self.assertRedirects(
            response,
            reverse("lesson_edit", args=[self.course.slug, lesson.pk]),
        )
        lesson.refresh_from_db()
        self.assertEqual(lesson.content, "Updated instructions")

    def test_other_users_cannot_manage_course_lessons(self):
        lesson = Lesson.objects.create(course=self.course, title="Variables")
        other_user = User.objects.create_user(username="learner", password="password")
        self.client.force_login(other_user)

        response = self.client.get(
            reverse("lesson_edit", args=[self.course.slug, lesson.pk])
        )

        self.assertEqual(response.status_code, 404)

    def test_lesson_authoring_requires_login(self):
        self.client.logout()

        response = self.client.get(reverse("lesson_create", args=[self.course.slug]))

        self.assertEqual(response.status_code, 302)
