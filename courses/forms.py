from django import forms

from .models import Lesson


class LessonForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = ["title", "content", "order", "estimated_minutes"]
        widgets = {
            "content": forms.Textarea(
                attrs={
                    "rows": 18,
                    "placeholder": "Write the lesson instructions and examples here.",
                }
            ),
        }
