from django import forms

from .models import Question


def build_quiz_form(questions):
    """Dynamically builds a Form subclass with one required RadioSelect
    field per question, so Django's normal form validation/rendering
    applies even though the question set differs per quiz."""
    fields = {}
    for question in questions:
        fields[f"question_{question.id}"] = forms.ChoiceField(
            choices=[(letter, question.option_text(letter)) for letter, _ in Question.OPTION_CHOICES],
            widget=forms.RadioSelect,
            label=question.question_text,
        )
    return type("QuizAttemptForm", (forms.Form,), fields)
