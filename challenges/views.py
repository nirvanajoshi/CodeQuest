from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, render

from .models import Challenge


def challenge_list(request):
    challenges = Challenge.objects.filter(is_published=True).select_related("lesson__course")

    query = request.GET.get("q", "").strip()
    if query:
        challenges = challenges.filter(title__icontains=query)

    difficulty = request.GET.get("difficulty", "")
    if difficulty in Challenge.Difficulty.values:
        challenges = challenges.filter(difficulty=difficulty)

    page_obj = Paginator(challenges, 10).get_page(request.GET.get("page"))

    query_params = request.GET.copy()
    query_params.pop("page", None)
    querystring = query_params.urlencode()

    return render(
        request,
        "challenges/challenge_list.html",
        {
            "page_obj": page_obj,
            "query": query,
            "difficulty": difficulty,
            "difficulty_choices": Challenge.Difficulty.choices,
            "querystring": querystring,
        },
    )


def challenge_detail(request, slug):
    challenge = get_object_or_404(Challenge, slug=slug, is_published=True)
    return render(request, "challenges/challenge_detail.html", {"challenge": challenge})
