from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.community_chat, name="community_chat"),
    path("chat/messages/", views.community_chat_messages, name="community_chat_messages"),
    path("chat/send/", views.community_chat_send, name="community_chat_send"),
    path("course/<slug:course_slug>/", views.discussion_list, name="discussion_list"),
    path("course/<slug:course_slug>/new/", views.discussion_create, name="discussion_create"),
    path("<int:pk>/", views.discussion_detail, name="discussion_detail"),
    path("<int:pk>/comment/", views.comment_create, name="comment_create"),
    path("comments/<int:pk>/report/", views.comment_report, name="comment_report"),
]
