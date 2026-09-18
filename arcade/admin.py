from django.contrib import admin

from .models import ArcadeAttempt


@admin.register(ArcadeAttempt)
class ArcadeAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "game", "score", "detail", "created_at")
    list_filter = ("game",)
    search_fields = ("user__username",)
