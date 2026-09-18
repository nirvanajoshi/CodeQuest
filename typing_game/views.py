import json
import re

from django.contrib.auth.decorators import login_required
from django.db.models import Max
from django.http import Http404
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from gamification.services import record_typing_attempt

from .models import TypingAttempt, TypingText

MODES = [
    {
        "key": "classic",
        "label": "Classic Sprint",
        "icon": "⌨️",
        "description": "The straightforward typing test — clean stats, no distractions.",
    },
    {
        "key": "car_race",
        "label": "Car Race",
        "icon": "🏎️",
        "description": "Your car moves as you type. Beat the rival car to the finish line.",
    },
    {
        "key": "battle",
        "label": "Boss Battle",
        "icon": "👾",
        "description": "Every correct word damages the boss. Every typo costs you HP.",
    },
    {
        "key": "rocket",
        "label": "Rocket Launch",
        "icon": "🚀",
        "description": "Type fast to climb before your fuel runs out and reach orbit.",
    },
    {
        "key": "word_rain",
        "label": "Word Rain",
        "icon": "🌧️",
        "description": "Words fall from the sky — type them before they hit the ground.",
    },
]
MODE_BY_KEY = {mode["key"]: mode for mode in MODES}

DEFAULT_WORDS = [
    "function", "variable", "loop", "array", "object", "string", "boolean",
    "return", "import", "class", "method", "python", "django", "server",
    "database", "keyboard", "compile", "debug", "syntax", "module",
]

# Clamp bounds for self-reported client-side results (see submissions/grading.py
# and quiz timers for the same "trust but bound" approach used elsewhere).
MAX_WPM = 300
MAX_DURATION_SECONDS = 3600


def _clamp(value, low, high):
    return max(low, min(high, value))


def game_home(request):
    return render(request, "typing_game/home.html", {"modes": MODES})


def play(request, mode):
    mode_info = MODE_BY_KEY.get(mode)
    if mode_info is None:
        raise Http404("Unknown game mode.")

    text = TypingText.objects.filter(is_active=True).order_by("?").first()
    words = re.findall(r"[A-Za-z']+", text.body)[:25] if text else []
    if not words:
        words = DEFAULT_WORDS

    return render(
        request,
        "typing_game/play.html",
        {
            "mode": mode,
            "mode_label": mode_info["label"],
            "mode_icon": mode_info["icon"],
            "text": text,
            "text_json": json.dumps(text.body if text else ""),
            "words_json": json.dumps(words),
            "difficulty": text.difficulty if text else TypingText.Difficulty.EASY,
        },
    )


@login_required
@require_POST
def record_attempt(request):
    mode = request.POST.get("mode", "")
    if mode not in TypingAttempt.Mode.values:
        raise Http404("Unknown game mode.")

    try:
        wpm = int(float(request.POST.get("wpm", 0)))
        accuracy = int(float(request.POST.get("accuracy", 0)))
        duration = float(request.POST.get("duration", 0))
    except ValueError:
        wpm, accuracy, duration = 0, 0, 0

    wpm = _clamp(wpm, 0, MAX_WPM)
    accuracy = _clamp(accuracy, 0, 100)
    duration = _clamp(duration, 0, MAX_DURATION_SECONDS)
    outcome = request.POST.get("outcome", "")[:20]

    text = TypingText.objects.filter(pk=request.POST.get("text_id")).first()

    attempt = TypingAttempt.objects.create(
        user=request.user,
        text=text,
        mode=mode,
        wpm=wpm,
        accuracy=accuracy,
        duration_seconds=duration,
        outcome=outcome,
    )
    xp_awarded = record_typing_attempt(request.user, attempt)

    return render(
        request,
        "typing_game/result.html",
        {
            "attempt": attempt,
            "mode_label": MODE_BY_KEY[mode]["label"],
            "xp_awarded": xp_awarded,
        },
    )


def leaderboard(request):
    mode = request.GET.get("mode", "")
    if mode and mode not in MODE_BY_KEY:
        mode = ""

    attempts = TypingAttempt.objects.all()
    if mode:
        attempts = attempts.filter(mode=mode)

    rankings = (
        attempts.values("user__username")
        .annotate(best_wpm=Max("wpm"))
        .order_by("-best_wpm")[:50]
    )

    return render(
        request,
        "typing_game/leaderboard.html",
        {"rankings": rankings, "modes": MODES, "selected_mode": mode},
    )
