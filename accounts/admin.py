from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "skill_level", "total_xp", "current_streak", "created_at")
    list_filter = ("skill_level",)
    search_fields = ("user__username", "user__email", "college")
