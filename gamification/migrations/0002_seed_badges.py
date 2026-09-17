from django.db import migrations

BADGES = [
    {
        "name": "First Steps",
        "description": "Solve your first challenge.",
        "icon": "🥇",
        "requirement_type": "challenges_solved",
        "requirement_value": 1,
    },
    {
        "name": "Problem Solver",
        "description": "Solve 10 challenges.",
        "icon": "🧩",
        "requirement_type": "challenges_solved",
        "requirement_value": 10,
    },
    {
        "name": "Consistent Learner",
        "description": "Maintain a 7-day streak.",
        "icon": "🔥",
        "requirement_type": "streak_days",
        "requirement_value": 7,
    },
]


def seed_badges(apps, schema_editor):
    Badge = apps.get_model("gamification", "Badge")
    for data in BADGES:
        Badge.objects.get_or_create(name=data["name"], defaults=data)


def remove_badges(apps, schema_editor):
    Badge = apps.get_model("gamification", "Badge")
    Badge.objects.filter(name__in=[b["name"] for b in BADGES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("gamification", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_badges, remove_badges),
    ]
