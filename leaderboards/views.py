from django.db.models import Max
from django.shortcuts import get_object_or_404, render

from accounts.models import Profile
from challenges.models import Challenge
from courses.models import Course
from submissions.models import Submission

TOP_N = 50


def global_leaderboard(request):
    rankings = (
        Profile.objects.select_related("user")
        .filter(total_xp__gt=0)
        .order_by("-total_xp")[:TOP_N]
    )
    return render(request, "leaderboards/global.html", {"rankings": rankings})


def course_leaderboard(request, slug):
    course = get_object_or_404(Course, slug=slug, is_published=True)
    challenge_ids = Challenge.objects.filter(lesson__course=course).values_list(
        "id", flat=True
    )

    best_per_user_challenge = (
        Submission.objects.filter(challenge_id__in=challenge_ids)
        .values("user_id", "challenge_id")
        .annotate(best=Max("score"))
    )

    totals = {}
    for row in best_per_user_challenge:
        totals[row["user_id"]] = totals.get(row["user_id"], 0) + row["best"]

    ranked_user_ids = sorted(totals, key=lambda uid: totals[uid], reverse=True)[:TOP_N]
    profiles_by_user_id = {
        p.user_id: p
        for p in Profile.objects.select_related("user").filter(user_id__in=ranked_user_ids)
    }
    rankings = [
        {"profile": profiles_by_user_id[uid], "points": totals[uid]}
        for uid in ranked_user_ids
        if uid in profiles_by_user_id
    ]

    return render(
        request,
        "leaderboards/course.html",
        {"course": course, "rankings": rankings},
    )
