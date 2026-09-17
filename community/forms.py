from django import forms

from .models import Comment, Discussion


class DiscussionForm(forms.ModelForm):
    class Meta:
        model = Discussion
        fields = ["title", "body"]


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ["body"]
