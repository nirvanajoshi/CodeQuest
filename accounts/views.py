from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import redirect, render

from .forms import ProfileForm


def register(request):
    if request.user.is_authenticated:
        return redirect("profile")

    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("profile")
    else:
        form = UserCreationForm()

    return render(request, "accounts/register.html", {"form": form})


@login_required
def profile(request):
    context = {
        "profile": request.user.profile,
        "badges": request.user.badges.select_related("badge"),
        "xp_transactions": request.user.xp_transactions.all()[:10],
    }
    return render(request, "accounts/profile.html", context)


@login_required
def profile_edit(request):
    if request.method == "POST":
        form = ProfileForm(request.POST, request.FILES, instance=request.user.profile)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated.")
            return redirect("profile")
    else:
        form = ProfileForm(instance=request.user.profile)

    return render(request, "accounts/profile_edit.html", {"form": form})
