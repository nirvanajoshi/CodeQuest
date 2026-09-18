from django.shortcuts import render

from arcade.views import GAMES as ARCADE_GAMES
from typing_game.views import MODES as TYPING_MODES


def home(request):
    return render(request, "home.html")


def about(request):
    return render(request, "core/about.html")


def games_hub(request):
    return render(
        request,
        "core/games_hub.html",
        {"typing_modes": TYPING_MODES, "arcade_games": ARCADE_GAMES},
    )
