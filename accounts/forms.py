from django import forms

from .models import Profile


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ["bio", "avatar", "college", "skill_level"]
        widgets = {
            "bio": forms.Textarea(attrs={"rows": 4}),
        }
