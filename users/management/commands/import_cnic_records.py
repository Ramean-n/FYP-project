from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from users.identity import CNIC_RE, normalize_cnic, normalize_name, parse_identity_file
from users.models import CNICRecord


class Command(BaseCommand):
    help = 'Import full name and CNIC records from a CSV or Excel file.'

    def add_arguments(self, parser):
        parser.add_argument('path', help='Path to a CSV or .xlsx file with Full Name and CNIC columns.')

    def handle(self, *args, **options):
        path = Path(options['path'])
        if not path.exists():
            raise CommandError(f'File not found: {path}')

        with path.open('rb') as handle:
            django_file = File(handle, name=path.name)
            rows = parse_identity_file(django_file)

        imported = 0
        skipped = 0
        with transaction.atomic():
            CNICRecord.objects.all().delete()
            for row in rows:
                cnic = normalize_cnic(row['cnic'])
                if not CNIC_RE.fullmatch(cnic):
                    skipped += 1
                    continue
                CNICRecord.objects.create(
                    cnic=cnic,
                    full_name=row['full_name'],
                    normalized_name=normalize_name(row['full_name']),
                )
                imported += 1

        self.stdout.write(self.style.SUCCESS(f'Replaced verification database with {imported} CNIC record(s). Skipped {skipped}.'))
