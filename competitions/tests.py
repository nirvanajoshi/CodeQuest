import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Competition, CompetitionRegistration


class CompetitionStatusTests(TestCase):
    def test_upcoming_ongoing_completed_status(self):
        now = timezone.now()
        upcoming = Competition.objects.create(
            title="Upcoming", start_time=now + datetime.timedelta(days=1),
            end_time=now + datetime.timedelta(days=2),
        )
        ongoing = Competition.objects.create(
            title="Ongoing", start_time=now - datetime.timedelta(hours=1),
            end_time=now + datetime.timedelta(hours=1),
        )
        completed = Competition.objects.create(
            title="Completed", start_time=now - datetime.timedelta(days=2),
            end_time=now - datetime.timedelta(days=1),
        )
        self.assertEqual(upcoming.status, Competition.Status.UPCOMING)
        self.assertEqual(ongoing.status, Competition.Status.ONGOING)
        self.assertEqual(completed.status, Competition.Status.COMPLETED)
        self.assertTrue(upcoming.is_registration_open())
        self.assertTrue(ongoing.is_registration_open())
        self.assertFalse(completed.is_registration_open())


class RegistrationViewTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.competition = Competition.objects.create(
            title="Sprint", start_time=now - datetime.timedelta(minutes=5),
            end_time=now + datetime.timedelta(hours=1),
        )
        self.user = User.objects.create_user(username="racer", password="pw12345!")
        self.client.force_login(self.user)

    def test_register_and_unregister(self):
        self.client.post(reverse("competition_register", args=[self.competition.pk]))
        self.assertTrue(
            CompetitionRegistration.objects.filter(competition=self.competition, user=self.user).exists()
        )

        self.client.post(reverse("competition_unregister", args=[self.competition.pk]))
        self.assertFalse(
            CompetitionRegistration.objects.filter(competition=self.competition, user=self.user).exists()
        )

    def test_cannot_register_for_completed_competition(self):
        self.competition.start_time = timezone.now() - datetime.timedelta(days=2)
        self.competition.end_time = timezone.now() - datetime.timedelta(days=1)
        self.competition.save()

        self.client.post(reverse("competition_register", args=[self.competition.pk]))
        self.assertFalse(
            CompetitionRegistration.objects.filter(competition=self.competition, user=self.user).exists()
        )
