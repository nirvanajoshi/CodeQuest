from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from courses.models import Course
from notifications.models import Notification

from .models import Comment, Discussion, Report


class DiscussionAndCommentTests(TestCase):
    def setUp(self):
        self.course = Course.objects.create(title="Python Basics", slug="python-basics", is_published=True)
        self.author = User.objects.create_user(username="author", password="pw12345!")
        self.commenter = User.objects.create_user(username="commenter", password="pw12345!")

    def test_create_discussion(self):
        self.client.force_login(self.author)
        response = self.client.post(
            reverse("discussion_create", args=[self.course.slug]),
            {"title": "Help with loops", "body": "How do while loops work?"},
        )
        discussion = Discussion.objects.get(title="Help with loops")
        self.assertRedirects(response, reverse("discussion_detail", args=[discussion.pk]))
        self.assertEqual(discussion.author, self.author)

    def test_comment_notifies_discussion_author(self):
        discussion = Discussion.objects.create(course=self.course, author=self.author, title="T", body="B")
        self.client.force_login(self.commenter)
        self.client.post(reverse("comment_create", args=[discussion.pk]), {"body": "Here's how..."})

        self.assertTrue(Comment.objects.filter(discussion=discussion, author=self.commenter).exists())
        self.assertTrue(
            Notification.objects.filter(user=self.author, message__icontains="New comment").exists()
        )

    def test_author_commenting_on_own_discussion_gets_no_self_notification(self):
        discussion = Discussion.objects.create(course=self.course, author=self.author, title="T", body="B")
        self.client.force_login(self.author)
        self.client.post(reverse("comment_create", args=[discussion.pk]), {"body": "Update: solved it."})
        self.assertFalse(Notification.objects.filter(user=self.author).exists())

    def test_report_comment(self):
        discussion = Discussion.objects.create(course=self.course, author=self.author, title="T", body="B")
        comment = Comment.objects.create(discussion=discussion, author=self.commenter, body="spam")
        self.client.force_login(self.author)
        self.client.post(reverse("comment_report", args=[comment.pk]), {"reason": "spam"})
        self.assertTrue(Report.objects.filter(comment=comment, reported_by=self.author).exists())
