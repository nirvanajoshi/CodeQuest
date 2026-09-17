from django.contrib import admin

from .models import Comment, Discussion, Report


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "author", "created_at")
    list_filter = ("course",)
    search_fields = ("title", "body")
    inlines = [CommentInline]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("comment", "reported_by", "is_resolved", "created_at")
    list_filter = ("is_resolved",)
    actions = ["mark_resolved"]

    @admin.action(description="Mark selected reports as resolved")
    def mark_resolved(self, request, queryset):
        queryset.update(is_resolved=True)
