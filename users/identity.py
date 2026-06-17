import csv
import re
import zipfile
from io import TextIOWrapper
from xml.etree import ElementTree


NAME_RE = re.compile(r'^[A-Za-z ]+$')
PHONE_RE = re.compile(r'^03\d{9}$')
CNIC_RE = re.compile(r'^\d{5}-\d{7}-\d$')


def normalize_name(value):
    return re.sub(r'\s+', ' ', (value or '').strip()).lower()


def normalize_cnic(value):
    value = str(value or '').strip()
    digits = re.sub(r'\D', '', value)
    if len(digits) == 13:
        return f'{digits[:5]}-{digits[5:12]}-{digits[12]}'
    return value


def parse_identity_file(uploaded_file):
    name = (uploaded_file.name or '').lower()
    if name.endswith('.csv'):
        return _parse_csv(uploaded_file)
    if name.endswith('.xlsx'):
        return _parse_xlsx(uploaded_file)
    raise ValueError('Upload a CSV or Excel .xlsx file with full name and CNIC columns.')


def _parse_csv(uploaded_file):
    uploaded_file.seek(0)
    reader = csv.DictReader(TextIOWrapper(uploaded_file.file, encoding='utf-8-sig'))
    return _rows_from_dicts(reader)


def _parse_xlsx(uploaded_file):
    uploaded_file.seek(0)
    with zipfile.ZipFile(uploaded_file) as archive:
        shared_strings = _read_shared_strings(archive)
        sheet_name = _first_sheet_name(archive)
        root = ElementTree.fromstring(archive.read(sheet_name))
        ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = []
        for row in root.findall('.//main:sheetData/main:row', ns):
            values = {}
            for cell in row.findall('main:c', ns):
                ref = cell.attrib.get('r', '')
                column = re.sub(r'\d+', '', ref)
                values[column] = _cell_value(cell, shared_strings, ns)
            if values:
                rows.append(values)
        if not rows:
            return []

        headers = {column: _header_key(value) for column, value in rows[0].items()}
        records = []
        for row in rows[1:]:
            item = {}
            for column, value in row.items():
                key = headers.get(column)
                if key:
                    item[key] = value
            records.append(item)
        return _rows_from_dicts(records)


def _read_shared_strings(archive):
    try:
        root = ElementTree.fromstring(archive.read('xl/sharedStrings.xml'))
    except KeyError:
        return []
    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings = []
    for item in root.findall('main:si', ns):
        strings.append(''.join(text.text or '' for text in item.findall('.//main:t', ns)))
    return strings


def _first_sheet_name(archive):
    try:
        workbook = ElementTree.fromstring(archive.read('xl/workbook.xml'))
        rels = ElementTree.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        main_ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rel_ns = {'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        first_sheet = workbook.find('.//main:sheets/main:sheet', main_ns)
        rel_id = first_sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        for rel in rels.findall('rel:Relationship', rel_ns):
            if rel.attrib.get('Id') == rel_id:
                target = rel.attrib.get('Target', 'worksheets/sheet1.xml')
                return f"xl/{target.lstrip('/')}" if not target.startswith('xl/') else target
    except Exception:
        pass
    return 'xl/worksheets/sheet1.xml'


def _cell_value(cell, shared_strings, ns):
    if cell.attrib.get('t') == 'inlineStr':
        return ''.join(text.text or '' for text in cell.findall('.//main:t', ns)).strip()
    value = cell.find('main:v', ns)
    if value is None:
        return ''
    raw = value.text or ''
    if cell.attrib.get('t') == 's':
        try:
            return shared_strings[int(raw)].strip()
        except (ValueError, IndexError):
            return ''
    return raw.strip()


def _header_key(value):
    clean = re.sub(r'[^a-z]', '', str(value or '').lower())
    if clean in {'fullname', 'name', 'username'}:
        return 'full_name'
    if clean in {'cnic', 'nic', 'nationalid', 'nationalidentitycard'}:
        return 'cnic'
    return ''


def _rows_from_dicts(rows):
    parsed = []
    for row in rows:
        lowered = {_header_key(key): value for key, value in row.items()}
        full_name = lowered.get('full_name', '')
        cnic = normalize_cnic(lowered.get('cnic', ''))
        if full_name and cnic:
            parsed.append({'full_name': str(full_name).strip(), 'cnic': cnic})
    return parsed
