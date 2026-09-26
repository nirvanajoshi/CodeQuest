from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("arcade", "0005_alter_arcadeattempt_game"),
    ]

    operations = [
        migrations.AlterField(
            model_name="arcadeattempt",
            name="game",
            field=models.CharField(
                choices=[
                    ("snake", "Snake"),
                    ("minesweeper", "Minesweeper"),
                    ("memory_match", "Memory Match"),
                    ("reaction_time", "Reaction Time"),
                    ("archery", "Archery"),
                    ("chess", "Chess"),
                    ("car_racing", "Car Racing"),
                    ("bounce", "Bounce"),
                    ("breakout", "Breakout"),
                    ("pong", "Pong"),
                ],
                max_length=20,
            ),
        ),
    ]