from django.shortcuts import get_object_or_404, render

from .models import Challenge


def challenge_list(request):
    challenges = Challenge.objects.filter(is_published=True).select_related("lesson__course")
    return render(request, "challenges/challenge_list.html", {"challenges": challenges})


def challenge_detail(request, slug):
    challenge = get_object_or_404(Challenge, slug=slug, is_published=True)
    return render(request, "challenges/challenge_detail.html", {"challenge": challenge})
