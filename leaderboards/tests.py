from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse


class GlobalLeaderboardTests(TestCase):
    def test_ranked_by_xp_descending_and_excludes_zero_xp(self):
        low = User.objects.create_user(username="low", password="pw12345!")
        low.profile.total_xp = 10
        low.profile.save()

        high = User.objects.create_user(username="high", password="pw12345!")
        high.profile.total_xp = 50
        high.profile.save()

        User.objects.create_user(username="zero", password="pw12345!")

        response = self.client.get(reverse("global_leaderboard"))
        usernames = [p.user.username for p in response.context["rankings"]]
        self.assertEqual(usernames, ["high", "low"])
