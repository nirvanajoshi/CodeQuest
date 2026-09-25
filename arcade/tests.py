from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import ArcadeAttempt


class GameHomeAndPlayTests(TestCase):
    def test_home_lists_games_including_pong(self):
        response = self.client.get(reverse("arcade_home"))
        self.assertEqual(response.status_code, 200)
        for game_key in ["snake", "memory_match", "reaction_time", "pong"]:
            self.assertContains(response, reverse("arcade_play", args=[game_key]))

    def test_play_page_accessible_without_login(self):
        response = self.client.get(reverse("arcade_play", args=["snake"]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="arcade-fullscreen"')

    def test_pong_page_is_playable_without_login(self):
        response = self.client.get(reverse("arcade_play", args=["pong"]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="pong-canvas"')
        self.assertContains(response, "First to five points wins")

    def test_unknown_game_404s(self):
        response = self.client.get(reverse("arcade_play", args=["not-a-game"]))
        self.assertEqual(response.status_code, 404)


class RecordAttemptTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="gamer", password="pw12345!")

    def test_requires_login(self):
        response = self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "snake", "score": 12, "detail": "Length 15", "duration": 30},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(ArcadeAttempt.objects.count(), 0)

    def test_records_attempt_and_awards_xp(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "snake", "score": 12, "detail": "Length 15", "duration": 30},
        )
        self.assertEqual(response.status_code, 200)
        attempt = ArcadeAttempt.objects.get(user=self.user)
        self.assertEqual(attempt.score, 12)
        self.assertEqual(attempt.game, "snake")

        self.user.profile.refresh_from_db()
        self.assertGreater(self.user.profile.total_xp, 0)

    def test_records_pong_attempt(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "pong", "score": 510, "detail": "Won 5-4", "duration": 38},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ArcadeAttempt.objects.get(user=self.user).game, "pong")

    def test_values_are_clamped_to_sane_bounds(self):
        self.client.force_login(self.user)
        self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "reaction_time", "score": 999999999, "duration": -5, "detail": "x" * 500},
        )
        attempt = ArcadeAttempt.objects.get(user=self.user)
        self.assertLessEqual(attempt.score, 100000)
        self.assertGreaterEqual(attempt.duration_seconds, 0)
        self.assertLessEqual(len(attempt.detail), 100)

    def test_second_attempt_same_day_same_game_awards_no_more_xp(self):
        self.client.force_login(self.user)
        self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "memory_match", "score": 500, "duration": 40},
        )
        self.user.profile.refresh_from_db()
        xp_after_first = self.user.profile.total_xp

        self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "memory_match", "score": 800, "duration": 20},
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.total_xp, xp_after_first)
        self.assertEqual(ArcadeAttempt.objects.filter(user=self.user).count(), 2)

    def test_unknown_game_404s_on_record(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("arcade_record_attempt"),
            {"game": "not-a-game", "score": 1, "duration": 1},
        )
        self.assertEqual(response.status_code, 404)


class LeaderboardTests(TestCase):
    def test_leaderboard_ranks_by_best_score_per_user(self):
        alice = User.objects.create_user(username="alice", password="pw12345!")
        bob = User.objects.create_user(username="bob", password="pw12345!")
        ArcadeAttempt.objects.create(user=alice, game="snake", score=10, duration_seconds=20)
        ArcadeAttempt.objects.create(user=alice, game="snake", score=25, duration_seconds=40)
        ArcadeAttempt.objects.create(user=bob, game="snake", score=15, duration_seconds=25)

        response = self.client.get(reverse("arcade_leaderboard"))
        self.assertEqual(response.status_code, 200)
        rankings = list(response.context["rankings"])
        self.assertEqual(rankings[0]["user__username"], "alice")
        self.assertEqual(rankings[0]["best_score"], 25)
        self.assertEqual(rankings[1]["user__username"], "bob")

    def test_leaderboard_filters_by_game(self):
        alice = User.objects.create_user(username="alice", password="pw12345!")
        ArcadeAttempt.objects.create(user=alice, game="snake", score=10, duration_seconds=20)

        response = self.client.get(reverse("arcade_leaderboard"), {"game": "memory_match"})
        self.assertEqual(len(response.context["rankings"]), 0)


class GamesHubTests(TestCase):
    def test_games_hub_lists_typing_and_arcade(self):
        response = self.client.get(reverse("games_hub"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse("arcade_play", args=["snake"]))
        self.assertContains(response, reverse("typing_game_play", args=["classic"]))
