from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from gamification.services import record_quiz_attempt

from .forms import build_quiz_form
from .models import Quiz, QuizAnswer, QuizAttempt


def quiz_list(request):
    quizzes = Quiz.objects.filter(is_published=True).select_related("course")
    page_obj = Paginator(quizzes, 10).get_page(request.GET.get("page"))
    return render(request, "quizzes/quiz_list.html", {"page_obj": page_obj})


def quiz_detail(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk, is_published=True)
    attempts = []
    if request.user.is_authenticated:
        attempts = quiz.attempts.filter(user=request.user, completed_at__isnull=False)
    return render(request, "quizzes/quiz_detail.html", {"quiz": quiz, "attempts": attempts})


@login_required
def quiz_take(request, pk):
    quiz = get_object_or_404(Quiz, pk=pk, is_published=True)
    questions = list(quiz.questions.all())
    FormClass = build_quiz_form(questions)

    if request.method == "POST":
        attempt = get_object_or_404(
            QuizAttempt,
            pk=request.POST.get("attempt_id"),
            user=request.user,
            quiz=quiz,
            completed_at__isnull=True,
        )
        form = FormClass(request.POST)
        if form.is_valid():
            earned_points = 0
            total_points = 0
            for question in questions:
                total_points += question.points
                selected = form.cleaned_data[f"question_{question.id}"]
                is_correct = selected == question.correct_option
                if is_correct:
                    earned_points += question.points
                QuizAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=selected,
                    is_correct=is_correct,
                )

            attempt.score = round((earned_points / total_points) * 100) if total_points else 0
            attempt.completed_at = timezone.now()
            attempt.save()

            record_quiz_attempt(request.user, attempt)
            return redirect("quiz_result", pk=attempt.pk)
    else:
        attempt = QuizAttempt.objects.create(user=request.user, quiz=quiz)
        form = FormClass()

    return render(
        request,
        "quizzes/quiz_take.html",
        {"quiz": quiz, "form": form, "attempt": attempt},
    )


@login_required
def quiz_result(request, pk):
    attempt = get_object_or_404(QuizAttempt, pk=pk, user=request.user, completed_at__isnull=False)
    answers = attempt.answers.select_related("question")
    return render(
        request, "quizzes/quiz_result.html", {"attempt": attempt, "answers": answers}
    )
