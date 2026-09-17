from django.contrib import admin

from .models import Competition, CompetitionChallenge, CompetitionRegistration


class CompetitionChallengeInline(admin.TabularInline):
    model = CompetitionChallenge
    extra = 1


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ("title", "start_time", "end_time", "status", "created_by")
    search_fields = ("title", "description")
    inlines = [CompetitionChallengeInline]

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CompetitionRegistration)
class CompetitionRegistrationAdmin(admin.ModelAdmin):
    list_display = ("user", "competition", "registered_at")
    search_fields = ("user__username", "competition__title")
