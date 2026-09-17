from django.urls import path

from . import views

urlpatterns = [
    path("", views.global_leaderboard, name="global_leaderboard"),
    path("course/<slug:slug>/", views.course_leaderboard, name="course_leaderboard"),
]
