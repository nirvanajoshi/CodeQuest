from django.contrib import admin

from .models import Question, Quiz, QuizAnswer, QuizAttempt


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "time_limit", "passing_score", "is_published")
    list_filter = ("is_published", "course")
    search_fields = ("title", "description")
    inlines = [QuestionInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "quiz", "score", "started_at", "completed_at")
    list_filter = ("quiz",)
    search_fields = ("user__username", "quiz__title")


admin.site.register(QuizAnswer)
