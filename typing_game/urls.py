from django.urls import path

from . import views

urlpatterns = [
    path("", views.game_home, name="typing_game_home"),
    path("leaderboard/", views.leaderboard, name="typing_leaderboard"),
    path("attempt/", views.record_attempt, name="typing_record_attempt"),
    path("<slug:mode>/", views.play, name="typing_game_play"),
]
