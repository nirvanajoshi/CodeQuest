from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from challenges.models import Challenge
from gamification.services import record_solve

from .forms import SubmissionForm
from .grading import grade_submission
from .models import Submission


@login_required
def submit_solution(request, slug):
    challenge = get_object_or_404(Challenge, slug=slug, is_published=True)

    if request.method == "POST":
        form = SubmissionForm(request.POST)
        if form.is_valid():
            submission = form.save(commit=False)
            submission.user = request.user
            submission.challenge = challenge
            submission.save()

            grade_submission(submission)
            if submission.status == Submission.Status.ACCEPTED:
                record_solve(request.user, challenge)

            return redirect("submission_detail", pk=submission.pk)
    else:
        form = SubmissionForm()

    return render(
        request, "submissions/submit_form.html", {"form": form, "challenge": challenge}
    )


@login_required
def submission_list(request):
    submissions = Submission.objects.filter(user=request.user).select_related("challenge")
    return render(request, "submissions/submission_list.html", {"submissions": submissions})


@login_required
def submission_detail(request, pk):
    submission = get_object_or_404(Submission, pk=pk, user=request.user)
    return render(request, "submissions/submission_detail.html", {"submission": submission})
