import datetime

from django.db import transaction

from .models import Badge, UserBadge, XPTransaction


def _update_streak(profile, today):
    last = profile.last_activity_date
    if last == today:
        return
    if last == today - datetime.timedelta(days=1):
        profile.current_streak += 1
    else:
        profile.current_streak = 1
    profile.last_activity_date = today


def _check_badges(user, profile):
    from submissions.models import Submission

    solved_count = (
        Submission.objects.filter(user=user, status=Submission.Status.ACCEPTED)
        .values("challenge_id")
        .distinct()
        .count()
    )

    already_earned_ids = UserBadge.objects.filter(user=user).values_list("badge_id", flat=True)

    for badge in Badge.objects.exclude(id__in=already_earned_ids):
        if badge.requirement_type == Badge.RequirementType.CHALLENGES_SOLVED:
            qualifies = solved_count >= badge.requirement_value
        elif badge.requirement_type == Badge.RequirementType.STREAK_DAYS:
            qualifies = profile.current_streak >= badge.requirement_value
        else:
            qualifies = False

        if qualifies:
            UserBadge.objects.get_or_create(user=user, badge=badge)


@transaction.atomic
def record_solve(user, challenge):
    """Called after a submission is graded as accepted. Awards XP the first
    time a given challenge is solved, updates the daily streak on every
    accepted submission, and checks badge thresholds."""
    from submissions.models import Submission

    profile = user.profile
    today = datetime.date.today()

    accepted_count = Submission.objects.filter(
        user=user, challenge=challenge, status=Submission.Status.ACCEPTED
    ).count()
    first_time_solve = accepted_count == 1

    if first_time_solve:
        XPTransaction.objects.create(
            user=user, amount=challenge.points, reason=f"Solved '{challenge.title}'"
        )
        profile.total_xp += challenge.points

    _update_streak(profile, today)
    profile.save()
    _check_badges(user, profile)
