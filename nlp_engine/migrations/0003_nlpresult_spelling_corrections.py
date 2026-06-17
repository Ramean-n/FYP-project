from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nlp_engine', '0002_nlpresult_low_quality_requirements_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='nlpresult',
            name='spelling_corrections',
            field=models.JSONField(default=dict),
        ),
        # Rename clusters from plain list → list of {label, requirements} dicts.
        # No schema change needed (still JSONField) — handled in application logic.
    ]
