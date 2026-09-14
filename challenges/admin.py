from django.contrib import admin

from .models import Challenge, TestCase


class TestCaseInline(admin.TabularInline):
    model = TestCase
    extra = 1


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("title", "lesson", "difficulty", "points", "is_published")
    list_filter = ("difficulty", "is_published")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [TestCaseInline]
