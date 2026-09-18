from django.contrib import admin

from .models import TypingAttempt, TypingText


@admin.register(TypingText)
class TypingTextAdmin(admin.ModelAdmin):
    list_display = ("title", "difficulty", "is_active", "created_at")
    list_filter = ("difficulty", "is_active")
    search_fields = ("title", "body")


@admin.register(TypingAttempt)
class TypingAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "mode", "wpm", "accuracy", "outcome", "created_at")
    list_filter = ("mode", "outcome")
    search_fields = ("user__username",)
