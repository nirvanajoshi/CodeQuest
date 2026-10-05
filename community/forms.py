from django import forms

from .models import ChatMessage, Comment, Discussion


class DiscussionForm(forms.ModelForm):
    class Meta:
        model = Discussion
        fields = ["title", "body"]


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ["body"]


class ChatMessageForm(forms.ModelForm):
    class Meta:
        model = ChatMessage
        fields = ["body"]
        widgets = {
            "body": forms.Textarea(attrs={"rows": 2, "maxlength": 1000}),
        }
