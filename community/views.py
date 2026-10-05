from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET

from courses.models import Course
from notifications.services import notify

from .forms import ChatMessageForm, CommentForm, DiscussionForm
from .models import ChatMessage, Comment, Discussion, Report


CHAT_HISTORY_LIMIT = 100


@require_GET
def community_chat(request):
    messages = list(
        ChatMessage.objects.select_related("author").order_by("-pk")[:CHAT_HISTORY_LIMIT]
    )
    messages.reverse()
    last_message_id = messages[-1].pk if messages else 0

    return render(
        request,
        "community/chat.html",
        {
            "chat_messages": messages,
            "last_message_id": last_message_id,
            "form": ChatMessageForm(),
        },
    )


@require_GET
def community_chat_messages(request):
    try:
        after_id = int(request.GET.get("after", "0"))
    except ValueError:
        return JsonResponse(
            {"error": "The 'after' parameter must be a non-negative integer."}, status=400
        )

    if after_id < 0:
        return JsonResponse(
            {"error": "The 'after' parameter must be a non-negative integer."}, status=400
        )

    messages = (
        ChatMessage.objects.filter(pk__gt=after_id)
        .select_related("author")
        .order_by("pk")[:CHAT_HISTORY_LIMIT]
    )
    return JsonResponse(
        {
            "messages": [
                {
                    "id": message.pk,
                    "username": message.author.get_username(),
                    "body": message.body,
                    "created_at": message.created_at.isoformat(),
                }
                for message in messages
            ]
        }
    )


@login_required
def community_chat_send(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST requests are required."}, status=405)

    form = ChatMessageForm(request.POST)
    if form.is_valid():
        message = form.save(commit=False)
        message.author = request.user
        message.save()
        return redirect("community_chat")

    messages = list(
        ChatMessage.objects.select_related("author").order_by("-pk")[:CHAT_HISTORY_LIMIT]
    )
    messages.reverse()
    last_message_id = messages[-1].pk if messages else 0
    return render(
        request,
        "community/chat.html",
        {
            "chat_messages": messages,
            "last_message_id": last_message_id,
            "form": form,
        },
        status=400,
    )


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
