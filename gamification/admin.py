from django.contrib import admin

from .models import Badge, UserBadge, XPTransaction


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ("name", "requirement_type", "requirement_value")
    list_filter = ("requirement_type",)


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ("user", "badge", "earned_at")
    list_filter = ("badge",)
    search_fields = ("user__username",)


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "reason", "created_at")
    search_fields = ("user__username", "reason")
