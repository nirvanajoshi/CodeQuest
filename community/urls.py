from django.urls import path

from . import views

urlpatterns = [
    path("course/<slug:course_slug>/", views.discussion_list, name="discussion_list"),
    path("course/<slug:course_slug>/new/", views.discussion_create, name="discussion_create"),
    path("<int:pk>/", views.discussion_detail, name="discussion_detail"),
    path("<int:pk>/comment/", views.comment_create, name="comment_create"),
    path("comments/<int:pk>/report/", views.comment_report, name="comment_report"),
]
