from django.db import migrations

BADGE = {
    "name": "Quiz Master",
    "description": "Score 90% or higher on a quiz.",
    "icon": "🎓",
    "requirement_type": "quiz_score",
    "requirement_value": 90,
}


def seed_badge(apps, schema_editor):
    Badge = apps.get_model("gamification", "Badge")
    Badge.objects.get_or_create(name=BADGE["name"], defaults=BADGE)


def remove_badge(apps, schema_editor):
    Badge = apps.get_model("gamification", "Badge")
    Badge.objects.filter(name=BADGE["name"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("gamification", "0002_seed_badges"),
        ("quizzes", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_badge, remove_badge),
    ]
