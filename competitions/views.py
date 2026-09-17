from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Max
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.models import Profile
from submissions.models import Submission

from .models import Competition, CompetitionRegistration


def competition_list(request):
    competitions = Competition.objects.all()
    page_obj = Paginator(competitions, 10).get_page(request.GET.get("page"))
    return render(request, "competitions/competition_list.html", {"page_obj": page_obj})


def _competition_leaderboard(competition):
    """Ranks registered users by points earned on this competition's
    challenges, scaled to each challenge's contest-specific point value,
    counting only their best submission made during the contest window."""
    window_end = min(timezone.now(), competition.end_time)
    registered_user_ids = competition.registrations.values_list("user_id", flat=True)

    totals = {uid: 0 for uid in registered_user_ids}
    for comp_challenge in competition.competition_challenges.select_related("challenge"):
        challenge = comp_challenge.challenge
        best_scores = (
            Submission.objects.filter(
                challenge=challenge,
                user_id__in=registered_user_ids,
                submitted_at__gte=competition.start_time,
                submitted_at__lte=window_end,
            )
            .values("user_id")
            .annotate(best=Max("score"))
        )
        for row in best_scores:
            if challenge.points:
                scaled = round(comp_challenge.points * row["best"] / challenge.points)
            else:
                scaled = 0
            totals[row["user_id"]] = totals.get(row["user_id"], 0) + scaled

    profiles_by_user_id = {
        p.user_id: p for p in Profile.objects.select_related("user").filter(user_id__in=totals)
    }
    ranked_user_ids = sorted(totals, key=lambda uid: totals[uid], reverse=True)
    return [
        {"profile": profiles_by_user_id[uid], "points": totals[uid]}
        for uid in ranked_user_ids
        if uid in profiles_by_user_id
    ]


def competition_detail(request, pk):
    competition = get_object_or_404(Competition, pk=pk)
    comp_challenges = competition.competition_challenges.select_related("challenge")
    is_registered = (
        request.user.is_authenticated
        and competition.registrations.filter(user=request.user).exists()
    )
    leaderboard = _competition_leaderboard(competition)
    return render(
        request,
        "competitions/competition_detail.html",
        {
            "competition": competition,
            "comp_challenges": comp_challenges,
            "is_registered": is_registered,
            "leaderboard": leaderboard,
        },
    )


@login_required
def competition_register(request, pk):
    competition = get_object_or_404(Competition, pk=pk)
    if request.method == "POST" and competition.is_registration_open():
        CompetitionRegistration.objects.get_or_create(competition=competition, user=request.user)
    return redirect("competition_detail", pk=competition.pk)


@login_required
def competition_unregister(request, pk):
    competition = get_object_or_404(Competition, pk=pk)
    if request.method == "POST":
        CompetitionRegistration.objects.filter(competition=competition, user=request.user).delete()
    return redirect("competition_detail", pk=competition.pk)
