from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase
from django.urls import reverse

from .models import Profile


class ProfileSignalTests(TestCase):
    def test_profile_auto_created_for_new_user(self):
        user = User.objects.create_user(username="alice", password="pw12345!")
        self.assertTrue(Profile.objects.filter(user=user).exists())


class RegistrationViewTests(TestCase):
    def test_register_creates_user_and_logs_in(self):
        response = self.client.post(
            reverse("register"),
            {"username": "bob", "password1": "SuperSecret123!", "password2": "SuperSecret123!"},
        )
        self.assertRedirects(response, reverse("profile"))
        self.assertTrue(User.objects.filter(username="bob").exists())
        self.assertTrue(Profile.objects.filter(user__username="bob").exists())


class ProfileEditTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="carol", password="pw12345!")
        self.client.force_login(self.user)

    def test_edit_updates_profile_fields(self):
        response = self.client.post(
            reverse("profile_edit"),
            {"bio": "Hello world", "college": "Tribhuvan University", "skill_level": "intermediate"},
        )
        self.assertRedirects(response, reverse("profile"))
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.bio, "Hello world")
        self.assertEqual(self.user.profile.skill_level, "intermediate")

    def test_edit_requires_login(self):
        self.client.logout()
        response = self.client.get(reverse("profile_edit"))
        self.assertEqual(response.status_code, 302)


class PasswordResetTests(TestCase):
    def test_password_reset_sends_email(self):
        User.objects.create_user(username="dave", email="dave@example.com", password="pw12345!")
        response = self.client.post(reverse("password_reset"), {"email": "dave@example.com"})
        self.assertRedirects(response, reverse("password_reset_done"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset", mail.outbox[0].subject.lower())
