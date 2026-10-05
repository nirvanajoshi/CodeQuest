from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from courses.models import Course
from notifications.models import Notification

from .models import ChatMessage, Comment, Discussion, Report


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


class CommunityChatTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="chat-user")

    def test_chat_page_shows_recent_messages(self):
        message = ChatMessage.objects.create(author=self.user, body="Hello, community!")

        response = self.client.get(reverse("community_chat"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Hello, community!")
        self.assertContains(response, f'data-last-message-id="{message.pk}"')

    def test_authenticated_user_can_send_message(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("community_chat_send"), {"body": "Hello from chat"}
        )

        message = ChatMessage.objects.get()
        self.assertEqual(message.author, self.user)
        self.assertEqual(message.body, "Hello from chat")
        self.assertRedirects(response, reverse("community_chat"))

    def test_anonymous_user_cannot_send_message(self):
        response = self.client.post(
            reverse("community_chat_send"), {"body": "Anonymous message"}
        )

        self.assertRedirects(
            response,
            f"{reverse('login')}?next={reverse('community_chat_send')}",
        )
        self.assertFalse(ChatMessage.objects.exists())

    def test_message_over_character_limit_is_rejected(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("community_chat_send"), {"body": "x" * 1001}
        )

        self.assertEqual(response.status_code, 400)
        self.assertContains(
            response, "Ensure this value has at most 1000 characters", status_code=400
        )
        self.assertFalse(ChatMessage.objects.exists())

    def test_poll_returns_only_messages_after_requested_id(self):
        first = ChatMessage.objects.create(author=self.user, body="First")
        second = ChatMessage.objects.create(author=self.user, body="Second")

        response = self.client.get(
            reverse("community_chat_messages"), {"after": first.pk}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["messages"],
            [
                {
                    "id": second.pk,
                    "username": self.user.username,
                    "body": "Second",
                    "created_at": second.created_at.isoformat(),
                }
            ],
        )

    def test_poll_rejects_invalid_message_id(self):
        response = self.client.get(
            reverse("community_chat_messages"), {"after": "not-an-id"}
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())
