from django.urls import path

from . import views

urlpatterns = [
    path("", views.challenge_list, name="challenge_list"),
    path("<slug:slug>/", views.challenge_detail, name="challenge_detail"),
]
