from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, render

from challenges.models import Challenge

from .models import Course


def course_list(request):
    courses = Course.objects.filter(is_published=True).select_related("instructor")
    return render(request, "courses/course_list.html", {"courses": courses})


def course_detail(request, slug):
    course = get_object_or_404(Course, slug=slug, is_published=True)
    published_challenges = Challenge.objects.filter(is_published=True)
    lessons = course.lessons.prefetch_related(
        Prefetch("challenges", queryset=published_challenges)
    )
    quizzes = course.quizzes.filter(is_published=True)
    return render(
        request,
        "courses/course_detail.html",
        {"course": course, "lessons": lessons, "quizzes": quizzes},
    )
