from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from courses.models import Course
from notifications.services import notify

from .forms import CommentForm, DiscussionForm
from .models import Comment, Discussion, Report


def discussion_list(request, course_slug):
    course = get_object_or_404(Course, slug=course_slug, is_published=True)
    discussions = course.discussions.select_related("author")
    return render(
        request, "community/discussion_list.html", {"course": course, "discussions": discussions}
    )


@login_required
def discussion_create(request, course_slug):
    course = get_object_or_404(Course, slug=course_slug, is_published=True)
    if request.method == "POST":
        form = DiscussionForm(request.POST)
        if form.is_valid():
            discussion = form.save(commit=False)
            discussion.course = course
            discussion.author = request.user
            discussion.save()
            return redirect("discussion_detail", pk=discussion.pk)
    else:
        form = DiscussionForm()
    return render(
        request, "community/discussion_form.html", {"course": course, "form": form}
    )


def discussion_detail(request, pk):
    discussion = get_object_or_404(Discussion, pk=pk)
    comments = discussion.comments.select_related("author")
    form = CommentForm() if request.user.is_authenticated else None
    return render(
        request,
        "community/discussion_detail.html",
        {"discussion": discussion, "comments": comments, "form": form},
    )


@login_required
def comment_create(request, pk):
    discussion = get_object_or_404(Discussion, pk=pk)
    if request.method == "POST":
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.discussion = discussion
            comment.author = request.user
            comment.save()

            if discussion.author_id != request.user.id:
                notify(
                    discussion.author,
                    f"New comment on your discussion '{discussion.title}'",
                    link=f"/community/{discussion.pk}/",
                )
    return redirect("discussion_detail", pk=discussion.pk)


@login_required
def comment_report(request, pk):
    comment = get_object_or_404(Comment, pk=pk)
    if request.method == "POST":
        Report.objects.get_or_create(
            comment=comment,
            reported_by=request.user,
            defaults={"reason": request.POST.get("reason", "")},
        )
    return redirect("discussion_detail", pk=comment.discussion_id)
