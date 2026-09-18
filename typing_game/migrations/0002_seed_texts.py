from django.db import migrations

TEXTS = [
    {
        "title": "The Quick Fox",
        "body": (
            "The quick brown fox jumps over the lazy dog. Pack my box with "
            "five dozen liquid jugs. A wizard's job is to vex chumps "
            "quickly in fog."
        ),
        "difficulty": "easy",
    },
    {
        "title": "First Steps in Code",
        "body": (
            "Every program starts with a single line. You write it, you "
            "run it, and you watch it work. Mistakes are not failures, "
            "they are the fastest way to learn how a computer actually "
            "thinks."
        ),
        "difficulty": "easy",
    },
    {
        "title": "Debugging Mindset",
        "body": (
            "A good developer does not fear a stack trace. They read it "
            "top to bottom, isolate the smallest failing case, and change "
            "one variable at a time until the bug has nowhere left to "
            "hide."
        ),
        "difficulty": "medium",
    },
    {
        "title": "Version Control Habits",
        "body": (
            "Commit early, commit often, and write a message that explains "
            "why the change was made, not just what changed. Future you, "
            "reading this log six months from now, will not remember the "
            "context unless you write it down."
        ),
        "difficulty": "medium",
    },
    {
        "title": "Algorithmic Thinking",
        "body": (
            "Efficient code rarely comes from cleverness alone; it comes "
            "from choosing the right data structure before a single line "
            "is written, measuring instead of guessing, and remembering "
            "that premature optimization wastes far more time than it "
            "ever saves."
        ),
        "difficulty": "hard",
    },
]


def seed_texts(apps, schema_editor):
    TypingText = apps.get_model("typing_game", "TypingText")
    for data in TEXTS:
        TypingText.objects.get_or_create(title=data["title"], defaults=data)


def remove_texts(apps, schema_editor):
    TypingText = apps.get_model("typing_game", "TypingText")
    TypingText.objects.filter(title__in=[t["title"] for t in TEXTS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("typing_game", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_texts, remove_texts),
    ]
