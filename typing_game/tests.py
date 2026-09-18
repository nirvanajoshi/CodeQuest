from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from gamification.models import Badge, UserBadge, XPTransaction

from .models import TypingAttempt, TypingText


class GameHomeAndPlayTests(TestCase):
    def test_home_lists_all_five_modes(self):
        response = self.client.get(reverse("typing_game_home"))
        self.assertEqual(response.status_code, 200)
        for mode_key in ["classic", "car_race", "battle", "rocket", "word_rain"]:
            self.assertContains(response, reverse("typing_game_play", args=[mode_key]))

    def test_play_page_accessible_without_login(self):
        response = self.client.get(reverse("typing_game_play", args=["classic"]))
        self.assertEqual(response.status_code, 200)

    def test_unknown_mode_404s(self):
        response = self.client.get(reverse("typing_game_play", args=["not-a-mode"]))
        self.assertEqual(response.status_code, 404)

    def test_play_page_works_with_no_texts_in_db(self):
        TypingText.objects.all().delete()
        response = self.client.get(reverse("typing_game_play", args=["word_rain"]))
        self.assertEqual(response.status_code, 200)


class RecordAttemptTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="typer", password="pw12345!")
        self.text = TypingText.objects.create(title="Sample", body="the quick brown fox")

    def test_requires_login(self):
        response = self.client.post(
            reverse("typing_record_attempt"),
            {"mode": "classic", "text_id": self.text.pk, "wpm": 50, "accuracy": 95, "duration": 12, "outcome": "finished"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(TypingAttempt.objects.count(), 0)

    def test_records_attempt_and_awards_xp(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("typing_record_attempt"),
            {"mode": "classic", "text_id": self.text.pk, "wpm": 50, "accuracy": 90, "duration": 12, "outcome": "finished"},
        )
        self.assertEqual(response.status_code, 200)
        attempt = TypingAttempt.objects.get(user=self.user)
        self.assertEqual(attempt.wpm, 50)
        self.assertEqual(attempt.outcome, "finished")

        self.user.profile.refresh_from_db()
        self.assertGreater(self.user.profile.total_xp, 0)
        self.assertEqual(XPTransaction.objects.filter(user=self.user).count(), 1)

    def test_values_are_clamped_to_sane_bounds(self):
        self.client.force_login(self.user)
        self.client.post(
            reverse("typing_record_attempt"),
            {"mode": "battle", "text_id": self.text.pk, "wpm": 99999, "accuracy": 500, "duration": -5, "outcome": "won"},
        )
        attempt = TypingAttempt.objects.get(user=self.user)
        self.assertLessEqual(attempt.wpm, 300)
        self.assertLessEqual(attempt.accuracy, 100)
        self.assertGreaterEqual(attempt.duration_seconds, 0)

    def test_second_attempt_same_day_same_mode_awards_no_more_xp(self):
        self.client.force_login(self.user)
        self.client.post(
            reverse("typing_record_attempt"),
            {"mode": "classic", "text_id": self.text.pk, "wpm": 50, "accuracy": 90, "duration": 12, "outcome": "finished"},
        )
        self.user.profile.refresh_from_db()
        xp_after_first = self.user.profile.total_xp

        self.client.post(
            reverse("typing_record_attempt"),
            {"mode": "classic", "text_id": self.text.pk, "wpm": 80, "accuracy": 99, "duration": 8, "outcome": "finished"},
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.total_xp, xp_after_first)
        self.assertEqual(TypingAttempt.objects.filter(user=self.user).count(), 2)

    def test_speed_typer_badge_awarded_at_40_wpm(self):
        Badge.objects.get_or_create(
            name="Speed Typer",
            defaults={
                "description": "Hit 40 WPM.",
                "icon": "⚡",
                "requirement_type": Badge.RequirementType.TYPING_WPM,
                "requirement_value": 40,
            },
        )
        self.client.force_login(self.user)
        self.client.post(
            reverse("typing_record_attempt"),
            {"mode": "classic", "text_id": self.text.pk, "wpm": 45, "accuracy": 95, "duration": 10, "outcome": "finished"},
        )
        self.assertTrue(
            UserBadge.objects.filter(user=self.user, badge__name="Speed Typer").exists()
        )


class LeaderboardTests(TestCase):
    def test_leaderboard_ranks_by_best_wpm_per_user(self):
        text = TypingText.objects.create(title="Sample", body="hello world")
        alice = User.objects.create_user(username="alice", password="pw12345!")
        bob = User.objects.create_user(username="bob", password="pw12345!")
        TypingAttempt.objects.create(user=alice, text=text, mode="classic", wpm=30, accuracy=90, duration_seconds=10)
        TypingAttempt.objects.create(user=alice, text=text, mode="classic", wpm=70, accuracy=95, duration_seconds=8)
        TypingAttempt.objects.create(user=bob, text=text, mode="classic", wpm=50, accuracy=92, duration_seconds=9)

        response = self.client.get(reverse("typing_leaderboard"))
        self.assertEqual(response.status_code, 200)
        rankings = list(response.context["rankings"])
        self.assertEqual(rankings[0]["user__username"], "alice")
        self.assertEqual(rankings[0]["best_wpm"], 70)
        self.assertEqual(rankings[1]["user__username"], "bob")

    def test_leaderboard_filters_by_mode(self):
        text = TypingText.objects.create(title="Sample", body="hello world")
        alice = User.objects.create_user(username="alice", password="pw12345!")
        TypingAttempt.objects.create(user=alice, text=text, mode="battle", wpm=60, accuracy=90, duration_seconds=10)

        response = self.client.get(reverse("typing_leaderboard"), {"mode": "car_race"})
        self.assertEqual(len(response.context["rankings"]), 0)
