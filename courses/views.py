from django.core.paginator import Paginator
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, render

from challenges.models import Challenge

from .models import Course, Lesson


def course_list(request):
    courses = Course.objects.filter(is_published=True).select_related("instructor")
    page_obj = Paginator(courses, 10).get_page(request.GET.get("page"))
    return render(request, "courses/course_list.html", {"page_obj": page_obj})


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


def lesson_detail(request, slug, pk):
    course = get_object_or_404(Course, slug=slug, is_published=True)
    lesson = get_object_or_404(Lesson, pk=pk, course=course)
    challenges = lesson.challenges.filter(is_published=True)
    return render(
        request,
        "courses/lesson_detail.html",
        {"course": course, "lesson": lesson, "challenges": challenges},
    )
