from django.db import migrations

BADGE = {
    "name": "Speed Typer",
    "description": "Hit 40 WPM in the typing game.",
    "icon": "⚡",
    "requirement_type": "typing_wpm",
    "requirement_value": 40,
}


def seed_badge(apps, schema_editor):
    Badge = apps.get_model("gamification", "Badge")
    Badge.objects.get_or_create(name=BADGE["name"], defaults=BADGE)


def remove_badge(apps, schema_editor):
    Badge = apps.get_model("gamification", "Badge")
    Badge.objects.filter(name=BADGE["name"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("gamification", "0005_alter_badge_requirement_type"),
    ]

    operations = [
        migrations.RunPython(seed_badge, remove_badge),
    ]
