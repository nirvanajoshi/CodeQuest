from django.urls import path

from . import views

urlpatterns = [
    path("", views.arcade_home, name="arcade_home"),
    path("leaderboard/", views.leaderboard, name="arcade_leaderboard"),
    path("attempt/", views.record_attempt, name="arcade_record_attempt"),
    path("<slug:game>/", views.play, name="arcade_play"),
]
