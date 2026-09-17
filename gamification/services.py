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
    from quizzes.models import QuizAttempt
    from submissions.models import Submission
    from notifications.services import notify

    solved_count = (
        Submission.objects.filter(user=user, status=Submission.Status.ACCEPTED)
        .values("challenge_id")
        .distinct()
        .count()
    )
    best_quiz_score = (
        QuizAttempt.objects.filter(user=user, completed_at__isnull=False)
        .order_by("-score")
        .values_list("score", flat=True)
        .first()
        or 0
    )

    already_earned_ids = UserBadge.objects.filter(user=user).values_list("badge_id", flat=True)

    for badge in Badge.objects.exclude(id__in=already_earned_ids):
        if badge.requirement_type == Badge.RequirementType.CHALLENGES_SOLVED:
            qualifies = solved_count >= badge.requirement_value
        elif badge.requirement_type == Badge.RequirementType.STREAK_DAYS:
            qualifies = profile.current_streak >= badge.requirement_value
        elif badge.requirement_type == Badge.RequirementType.QUIZ_SCORE:
            qualifies = best_quiz_score >= badge.requirement_value
        else:
            qualifies = False

        if qualifies:
            _, created = UserBadge.objects.get_or_create(user=user, badge=badge)
            if created:
                notify(
                    user,
                    f"You earned the '{badge.name}' badge! {badge.icon}",
                    link="/accounts/profile/",
                )


@transaction.atomic
def record_solve(user, challenge):
    """Called after a submission is graded as accepted. Awards XP the first
    time a given challenge is solved, updates the daily streak on every
    accepted submission, and checks badge thresholds."""
    from submissions.models import Submission
    from notifications.services import notify

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
        notify(
            user,
            f"Solved '{challenge.title}' (+{challenge.points} XP)",
            link=f"/challenges/{challenge.slug}/",
        )

    _update_streak(profile, today)
    profile.save()
    _check_badges(user, profile)


@transaction.atomic
def record_quiz_attempt(user, attempt):
    """Called after a quiz attempt is graded. Awards XP for a quiz's correct
    answers the first time it's completed, updates the daily streak, and
    checks badge thresholds (including quiz-score badges)."""
    from notifications.services import notify

    profile = user.profile
    today = datetime.date.today()

    completed_count = attempt.quiz.attempts.filter(
        user=user, completed_at__isnull=False
    ).count()
    first_completion = completed_count == 1

    if first_completion:
        earned_points = sum(
            answer.question.points for answer in attempt.answers.filter(is_correct=True)
        )
        if earned_points:
            XPTransaction.objects.create(
                user=user, amount=earned_points, reason=f"Completed quiz '{attempt.quiz.title}'"
            )
            profile.total_xp += earned_points
        notify(
            user,
            f"Completed quiz '{attempt.quiz.title}' — {attempt.score}%",
            link=f"/quizzes/attempts/{attempt.pk}/",
        )

    _update_streak(profile, today)
    profile.save()
    _check_badges(user, profile)
