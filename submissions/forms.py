from django import forms

from .models import Submission


class SubmissionForm(forms.ModelForm):
    class Meta:
        model = Submission
        fields = ["language", "source_code"]
        widgets = {
            "source_code": forms.Textarea(attrs={"rows": 16, "class": "code-editor"}),
        }
