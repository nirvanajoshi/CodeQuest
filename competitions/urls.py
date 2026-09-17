from django.urls import path

from . import views

urlpatterns = [
    path("", views.competition_list, name="competition_list"),
    path("<int:pk>/", views.competition_detail, name="competition_detail"),
    path("<int:pk>/register/", views.competition_register, name="competition_register"),
    path("<int:pk>/unregister/", views.competition_unregister, name="competition_unregister"),
]
