from django.urls import path

from . import views

urlpatterns = [
    path("", views.course_list, name="course_list"),
    path("<slug:slug>/", views.course_detail, name="course_detail"),
    path("<slug:slug>/lessons/<int:pk>/", views.lesson_detail, name="lesson_detail"),
]
