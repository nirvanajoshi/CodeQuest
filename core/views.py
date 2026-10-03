from django.shortcuts import render

from arcade.views import GAMES as ARCADE_GAMES
from gamification.services import get_daily_challenge_for_user, get_learning_recommendations
from typing_game.views import MODES as TYPING_MODES


def home(request):
    context = {}
    if request.user.is_authenticated:
        context["daily_challenge"] = get_daily_challenge_for_user(request.user)
        context["learning_path"] = get_learning_recommendations(request.user, limit=3)
    return render(request, "home.html", context)


def about(request):
    return render(request, "core/about.html")


def games_hub(request):
    return render(
        request,
        "core/games_hub.html",
        {"typing_modes": TYPING_MODES, "arcade_games": ARCADE_GAMES},
    )
