from django.urls import path

from . import views

urlpatterns = [
    path("", views.submission_list, name="submission_list"),
    path("challenge/<slug:slug>/submit/", views.submit_solution, name="submit_solution"),
    path("<int:pk>/", views.submission_detail, name="submission_detail"),
]
