from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Notification
from .services import notify


class NotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="notified", password="pw12345!")

    def test_notify_creates_notification(self):
        notify(self.user, "Hello", link="/somewhere/")
        self.assertTrue(Notification.objects.filter(user=self.user, message="Hello").exists())

    def test_viewing_list_marks_unread_as_read(self):
        notify(self.user, "Unread message")
        self.client.force_login(self.user)
        self.client.get(reverse("notification_list"))
        notification = Notification.objects.get(user=self.user)
        self.assertTrue(notification.is_read)

    def test_unread_count_in_nav_context(self):
        notify(self.user, "One")
        notify(self.user, "Two")
        self.client.force_login(self.user)
        response = self.client.get(reverse("home"))
        self.assertEqual(response.context["unread_notification_count"], 2)
