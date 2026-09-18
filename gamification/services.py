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
    from typing_game.models import TypingAttempt
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
    best_wpm = (
        TypingAttempt.objects.filter(user=user)
        .order_by("-wpm")
        .values_list("wpm", flat=True)
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
        elif badge.requirement_type == Badge.RequirementType.TYPING_WPM:
            qualifies = best_wpm >= badge.requirement_value
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
def record_typing_attempt(user, attempt):
    """Called after a typing-game attempt is recorded. Awards a small amount
    of XP based on speed and accuracy — capped, and only for a user's first
    attempt of the day in that mode, to keep the typing game from becoming a
    free XP farm — updates the daily streak, and checks badge thresholds
    (including typing-speed badges). Returns the XP awarded (0 if none)."""
    from notifications.services import notify
    from typing_game.models import TypingAttempt

    profile = user.profile
    today = datetime.date.today()

    already_today = (
        TypingAttempt.objects.filter(user=user, mode=attempt.mode, created_at__date=today)
        .exclude(pk=attempt.pk)
        .exists()
    )

    xp_awarded = 0
    if not already_today:
        xp_awarded = min(round(attempt.wpm * attempt.accuracy / 100), 60)
        if xp_awarded:
            XPTransaction.objects.create(
                user=user,
                amount=xp_awarded,
                reason=f"Typing game ({attempt.get_mode_display()}) — {attempt.wpm} WPM",
            )
            profile.total_xp += xp_awarded
            notify(
                user,
                f"Typing game: +{xp_awarded} XP ({attempt.wpm} WPM, {attempt.accuracy}% accuracy)",
                link="/typing/",
            )

    _update_streak(profile, today)
    profile.save()
    _check_badges(user, profile)
    return xp_awarded


@transaction.atomic
def record_arcade_attempt(user, attempt):
    """Called after an arcade-game attempt (Snake, Memory Match, Reaction
    Time, ...) is recorded. Awards a small amount of XP based on score —
    capped, and only for a user's first attempt of the day in that game, for
    the same anti-farming reason as record_typing_attempt — updates the
    daily streak, and checks badges. Returns the XP awarded (0 if none)."""
    from notifications.services import notify
    from arcade.models import ArcadeAttempt

    profile = user.profile
    today = datetime.date.today()

    already_today = (
        ArcadeAttempt.objects.filter(user=user, game=attempt.game, created_at__date=today)
        .exclude(pk=attempt.pk)
        .exists()
    )

    xp_awarded = 0
    if not already_today:
        xp_awarded = min(round(attempt.score / 5), 60)
        if xp_awarded:
            XPTransaction.objects.create(
                user=user,
                amount=xp_awarded,
                reason=f"Arcade ({attempt.get_game_display()}) — score {attempt.score}",
            )
            profile.total_xp += xp_awarded
            notify(
                user,
                f"{attempt.get_game_display()}: +{xp_awarded} XP (score {attempt.score})",
                link="/arcade/",
            )

    _update_streak(profile, today)
    profile.save()
    _check_badges(user, profile)
    return xp_awarded


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
