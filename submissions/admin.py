from django.contrib import admin

from .models import Submission


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "challenge",
        "language",
        "status",
        "score",
        "execution_time",
        "submitted_at",
    )
    list_filter = ("status", "language")
    search_fields = ("user__username", "challenge__title")
    date_hierarchy = "submitted_at"
