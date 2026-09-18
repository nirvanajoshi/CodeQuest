from django.contrib.auth.decorators import login_required
from django.db.models import Max
from django.http import Http404
from django.shortcuts import render
from django.views.decorators.http import require_POST

from gamification.services import record_arcade_attempt

from .models import ArcadeAttempt

GAMES = [
    {
        "key": "snake",
        "label": "Snake",
        "icon": "🐍",
        "description": "Classic Snake. Arrow keys or WASD — eat food, don't hit the walls or yourself.",
    },
    {
        "key": "memory_match",
        "label": "Memory Match",
        "icon": "🧠",
        "description": "Flip cards, find the pairs. Fewer moves and less time score higher.",
    },
    {
        "key": "reaction_time",
        "label": "Reaction Time",
        "icon": "⚡",
        "description": "Click the instant the box turns green. Five rounds, lower average wins.",
    },
]
GAME_BY_KEY = {game["key"]: game for game in GAMES}

MAX_SCORE = 100000
MAX_DURATION_SECONDS = 3600


def _clamp(value, low, high):
    return max(low, min(high, value))


def arcade_home(request):
    return render(request, "arcade/home.html", {"games": GAMES})


def play(request, game):
    game_info = GAME_BY_KEY.get(game)
    if game_info is None:
        raise Http404("Unknown game.")
    return render(
        request,
        "arcade/play.html",
        {"game": game, "game_label": game_info["label"], "game_icon": game_info["icon"]},
    )


@login_required
@require_POST
def record_attempt(request):
    game = request.POST.get("game", "")
    if game not in ArcadeAttempt.Game.values:
        raise Http404("Unknown game.")

    try:
        score = int(float(request.POST.get("score", 0)))
        duration = float(request.POST.get("duration", 0))
    except ValueError:
        score, duration = 0, 0

    score = _clamp(score, 0, MAX_SCORE)
    duration = _clamp(duration, 0, MAX_DURATION_SECONDS)
    detail = request.POST.get("detail", "")[:100]

    attempt = ArcadeAttempt.objects.create(
        user=request.user, game=game, score=score, detail=detail, duration_seconds=duration
    )
    xp_awarded = record_arcade_attempt(request.user, attempt)

    return render(
        request,
        "arcade/result.html",
        {
            "attempt": attempt,
            "game_label": GAME_BY_KEY[game]["label"],
            "xp_awarded": xp_awarded,
        },
    )


def leaderboard(request):
    game = request.GET.get("game", "")
    if game and game not in GAME_BY_KEY:
        game = ""

    attempts = ArcadeAttempt.objects.all()
    if game:
        attempts = attempts.filter(game=game)

    rankings = (
        attempts.values("user__username")
        .annotate(best_score=Max("score"))
        .order_by("-best_score")[:50]
    )

    return render(
        request,
        "arcade/leaderboard.html",
        {"rankings": rankings, "games": GAMES, "selected_game": game},
    )
