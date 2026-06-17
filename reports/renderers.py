"""PDF, DOCX, and CSV renderers for report export."""

import csv
import io
import re
import textwrap
import zipfile
from xml.sax.saxutils import escape

from .export_model import iter_csv_records


def render_csv(model):
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["Section", "ID", "Field", "Value"])
    for row in iter_csv_records(model):
        writer.writerow(row)
    return output.getvalue().encode("utf-8-sig")


def _docx_run(text, bold=False, color=None, size_pt=None):
    rpr = []
    if bold:
        rpr.append("<w:b/>")
    if color:
        rpr.append(f'<w:color w:val="{color}"/>')
    if size_pt:
        rpr.append(f'<w:sz w:val="{size_pt * 2}"/>')
    rpr_xml = f"<w:rPr>{''.join(rpr)}</w:rPr>" if rpr else ""
    return (
        f"<w:r>{rpr_xml}<w:t xml:space=\"preserve\">{escape(str(text))}</w:t></w:r>"
    )


def _docx_paragraph(text="", style=None, spacing_after=120, color=None, bold=False, size_pt=None):
    ppr = [f'<w:spacing w:after="{spacing_after}"/>']
    if style:
        ppr.insert(0, f'<w:pStyle w:val="{style}"/>')
    ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>"
    if text:
        body = _docx_run(text, bold=bold, color=color, size_pt=size_pt)
    else:
        body = ""
    return f"<w:p>{ppr_xml}{body}</w:p>"


def _docx_table(headers, rows):
    def cell(text, bold=False, shading=False):
        tc_pr = ""
        if shading:
            tc_pr = (
                '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/></w:tcPr>'
            )
        ppr = "<w:pPr><w:spacing w:after=\"0\"/></w:pPr>"
        run = _docx_run(text, bold=bold)
        return f"<w:tc>{tc_pr}<w:p>{ppr}{run}</w:p></w:tc>"

    col_count = len(headers)
    grid = "".join("<w:gridCol w:w=\"3200\"/>" for _ in range(col_count))
    header_row = "".join(cell(header, bold=True, shading=True) for header in headers)
    body_rows = []
    for row in rows:
        cells = list(row)
        while len(cells) < col_count:
            cells.append("")
        body_rows.append(
            "<w:tr>" + "".join(cell(value) for value in cells[:col_count]) + "</w:tr>"
        )

    return (
        "<w:tbl>"
        "<w:tblPr>"
        '<w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        "</w:tblBorders>"
        "</w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>"
        f"<w:tr>{header_row}</w:tr>"
        + "".join(body_rows)
        + "</w:tbl>"
    )


def render_docx(model):
    parts = [
        _docx_paragraph(model["title"], style="Heading1", spacing_after=160),
        _docx_paragraph(model["project_name"], style="Heading2", spacing_after=80),
        _docx_paragraph(f'Generated: {model["generated_at"]}', color="666666", spacing_after=160),
    ]

    if model["description"]:
        parts.append(_docx_paragraph("Description", style="Heading2"))
        parts.append(_docx_paragraph(model["description"], spacing_after=160))

    parts.append(_docx_paragraph("Summary", style="Heading2"))
    parts.append(
        _docx_table(
            ["Metric", "Value"],
            [(label, str(value)) for label, value in model["summary_rows"]],
        )
    )
    parts.append(_docx_paragraph("", spacing_after=160))

    if model["requirement_groups"]:
        parts.append(_docx_paragraph("Requirements", style="Heading2"))
        for group in model["requirement_groups"]:
            parts.append(_docx_paragraph(group["title"], style="Heading2"))
            parts.append(
                _docx_table(
                    ["ID", "Requirement", "Priority"],
                    [
                        (str(item["id"]), item["text"], item["priority"])
                        for item in group["items"]
                    ],
                )
            )
            parts.append(_docx_paragraph("", spacing_after=160))

    if model["narrative_text"]:
        parts.append(_docx_paragraph("Requirements Report", style="Heading2"))
        for paragraph in re.split(r"\n\s*\n", model["narrative_text"]):
            paragraph = paragraph.strip()
            if paragraph:
                parts.append(_docx_paragraph(paragraph, spacing_after=120))
        parts.append(_docx_paragraph("", spacing_after=160))

    if model["mcq_sections"]:
        parts.append(_docx_paragraph("MCQ Results", style="Heading2"))
        for section in model["mcq_sections"]:
            parts.append(_docx_paragraph(section["question"], style="Heading2"))
            parts.append(
                _docx_table(
                    ["Option", "Votes", "Share"],
                    [
                        (
                            option["option"],
                            str(option["count"]),
                            f'{option["percent"]}%',
                        )
                        for option in section["options"]
                    ],
                )
            )
            parts.append(_docx_paragraph("", spacing_after=160))

    if model["keywords"]:
        parts.append(_docx_paragraph("Keywords", style="Heading2"))
        parts.append(_docx_paragraph(", ".join(model["keywords"]), spacing_after=160))

    if model["low_quality"]:
        parts.append(_docx_paragraph("Low Quality Responses", style="Heading2"))
        parts.append(
            _docx_table(
                ["ID", "Response"],
                [(str(i), item) for i, item in enumerate(model["low_quality"], start=1)],
            )
        )
        parts.append(_docx_paragraph("", spacing_after=160))

    if model["spelling_corrections"]:
        parts.append(_docx_paragraph("Spelling Corrections", style="Heading2"))
        parts.append(
            _docx_table(
                ["Original", "Corrected"],
                [
                    (item["original"], item["corrected"])
                    for item in model["spelling_corrections"]
                ],
            )
        )
        parts.append(_docx_paragraph("", spacing_after=160))

    if model["duplicates"]:
        parts.append(_docx_paragraph("Duplicate Requirements", style="Heading2"))
        parts.append(
            _docx_table(
                ["Requirement", "Similar To", "Match"],
                [
                    (
                        dup.get("req1", ""),
                        dup.get("req2", ""),
                        f'{round(float(dup.get("similarity", 0)) * 100)}%',
                    )
                    for dup in model["duplicates"]
                ],
            )
        )

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(parts)
        + "<w:sectPr>"
        '<w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>'
        "</w:sectPr>"
        "</w:body>"
        "</w:document>"
    )

    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
        "<w:name w:val=\"Normal\"/>"
        "<w:qFormat/>"
        "</w:style>"
        '<w:style w:type="paragraph" w:styleId="Heading1">'
        "<w:name w:val=\"heading 1\"/>"
        "<w:basedOn w:val=\"Normal\"/>"
        "<w:uiPriority w:val=\"9\"/>"
        "<w:qFormat/>"
        "<w:pPr><w:keepNext/><w:spacing w:before=\"240\" w:after=\"120\"/>"
        "<w:outlineLvl w:val=\"0\"/></w:pPr>"
        "<w:rPr><w:b/><w:sz w:val=\"32\"/><w:color w:val=\"1F4E79\"/></w:rPr>"
        "</w:style>"
        '<w:style w:type="paragraph" w:styleId="Heading2">'
        "<w:name w:val=\"heading 2\"/>"
        "<w:basedOn w:val=\"Normal\"/>"
        "<w:uiPriority w:val=\"9\"/>"
        "<w:qFormat/>"
        "<w:pPr><w:keepNext/><w:spacing w:before=\"200\" w:after=\"80\"/>"
        "<w:outlineLvl w:val=\"1\"/></w:pPr>"
        "<w:rPr><w:b/><w:sz w:val=\"26\"/><w:color w:val=\"2E5090\"/></w:rPr>"
        "</w:style>"
        "</w:styles>"
    )

    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as docx:
        docx.writestr(
            "[Content_Types].xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                '<Override PartName="/word/styles.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                "</Types>"
            ),
        )
        docx.writestr(
            "_rels/.rels",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
                'Target="word/document.xml"/>'
                "</Relationships>"
            ),
        )
        docx.writestr(
            "word/_rels/document.xml.rels",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
                'Target="styles.xml"/>'
                "</Relationships>"
            ),
        )
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/styles.xml", styles_xml)
    return output.getvalue()


def _pdf_escape(value):
    text = str(value).replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = text.replace("\n", "\\n").replace("\t", "\\t")
    return text.encode("latin-1", errors="replace").decode("latin-1")


class _PdfBuilder:
    PAGE_WIDTH = 612
    PAGE_HEIGHT = 792
    MARGIN_X = 50
    MARGIN_TOP = 760
    MARGIN_BOTTOM = 50
    LINE_HEIGHT = 14

    def __init__(self):
        self.pages = []
        self.current_y = self.MARGIN_TOP
        self.page_number = 0
        self._new_page()

    def _new_page(self):
        self.page_number += 1
        self.current_y = self.MARGIN_TOP
        self.pages.append([])

    def _ensure_space(self, height):
        if self.current_y - height < self.MARGIN_BOTTOM + 20:
            self._new_page()

    def _add_cmd(self, cmd):
        self.pages[-1].append(cmd)

    def text(self, x, y, text, font="F1", size=10):
        escaped = _pdf_escape(text)
        self._add_cmd("BT")
        self._add_cmd(f"/{font} {size} Tf")
        self._add_cmd(f"{x} {y} Td")
        self._add_cmd(f"({escaped}) Tj")
        self._add_cmd("ET")

    def line(self, x1, y1, x2, y2, width=0.75):
        self._add_cmd(f"{width} w")
        self._add_cmd(f"{x1} {y1} m")
        self._add_cmd(f"{x2} {y2} l")
        self._add_cmd("S")

    def filled_rect(self, x, y, width, height, gray=0.88):
        self._add_cmd(f"{gray} g")
        self._add_cmd(f"{x} {y} {width} {height} re")
        self._add_cmd("f")
        self._add_cmd("0 g")

    def draw_title_block(self, model):
        self.text(self.MARGIN_X, self.current_y, model["title"], font="F2", size=18)
        self.current_y -= 24
        self.text(self.MARGIN_X, self.current_y, model["project_name"], font="F2", size=13)
        self.current_y -= 18
        self.text(
            self.MARGIN_X,
            self.current_y,
            f'Generated: {model["generated_at"]}',
            font="F1",
            size=9,
        )
        self.current_y -= 16
        if model["description"]:
            for chunk in textwrap.wrap(model["description"], width=95):
                self._ensure_space(self.LINE_HEIGHT)
                self.text(self.MARGIN_X, self.current_y, chunk, font="F1", size=10)
                self.current_y -= self.LINE_HEIGHT
        self.current_y -= self.LINE_HEIGHT

    def draw_section_heading(self, title):
        self._ensure_space(28)
        self.text(self.MARGIN_X, self.current_y, title, font="F2", size=12)
        self.current_y -= 8
        self.line(self.MARGIN_X, self.current_y, self.PAGE_WIDTH - self.MARGIN_X, self.current_y)
        self.current_y -= 16

    def draw_table(self, headers, rows, col_widths):
        row_height = 16
        table_width = sum(col_widths)
        x0 = self.MARGIN_X

        self._ensure_space(row_height + 4)
        self.filled_rect(x0, self.current_y - row_height + 4, table_width, row_height)
        x = x0 + 4
        for header, width in zip(headers, col_widths):
            self.text(x, self.current_y - 10, header, font="F2", size=9)
            x += width
        self.current_y -= row_height

        for row in rows:
            self._ensure_space(row_height)
            x = x0 + 4
            cells = list(row)
            while len(cells) < len(headers):
                cells.append("")
            for cell, width in zip(cells, col_widths):
                cell_text = str(cell)
                max_chars = max(int(width / 5.5), 8)
                if len(cell_text) > max_chars:
                    cell_text = cell_text[: max_chars - 3] + "..."
                self.text(x, self.current_y - 10, cell_text, font="F1", size=9)
                x += width
            self.current_y -= row_height

        self.current_y -= self.LINE_HEIGHT

    def draw_paragraphs(self, text):
        for paragraph in re.split(r"\n\s*\n", text):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            for line in textwrap.wrap(paragraph, width=95):
                self._ensure_space(self.LINE_HEIGHT)
                self.text(self.MARGIN_X, self.current_y, line, font="F1", size=10)
                self.current_y -= self.LINE_HEIGHT
            self.current_y -= 4

    def build(self):
        objects = {
            1: b"<< /Type /Catalog /Pages 2 0 R >>",
            3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            4: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        }
        page_ids = []
        next_id = 5

        for page_index, commands in enumerate(self.pages, start=1):
            footer_label = _pdf_escape(f"Page {page_index} of {len(self.pages)}")
            stream = [
                "BT",
                "/F1 9 Tf",
                f"1 0 0 1 {self.PAGE_WIDTH - 120} 30 Tm",
                f"({footer_label}) Tj",
                "ET",
            ]
            stream.extend(commands)
            stream_bytes = "\n".join(stream).encode("latin-1", errors="replace")

            page_id = next_id
            content_id = next_id + 1
            next_id += 2
            page_ids.append(page_id)
            objects[page_id] = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.PAGE_WIDTH} {self.PAGE_HEIGHT}] "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
                f"/Contents {content_id} 0 R >>"
            ).encode("utf-8")
            objects[content_id] = (
                f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("utf-8")
                + stream_bytes
                + b"\nendstream"
            )

        kids = " ".join(f"{pid} 0 R" for pid in page_ids)
        objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("utf-8")

        output = io.BytesIO()
        output.write(b"%PDF-1.4\n")
        offsets = {}
        max_id = max(objects)
        for index in range(1, max_id + 1):
            offsets[index] = output.tell()
            output.write(f"{index} 0 obj\n".encode("utf-8"))
            output.write(objects[index])
            output.write(b"\nendobj\n")
        xref = output.tell()
        output.write(f"xref\n0 {max_id + 1}\n0000000000 65535 f \n".encode("utf-8"))
        for index in range(1, max_id + 1):
            output.write(f"{offsets[index]:010d} 00000 n \n".encode("utf-8"))
        output.write(
            f"trailer\n<< /Size {max_id + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode(
                "utf-8"
            )
        )
        return output.getvalue()


def render_pdf(model):
    pdf = _PdfBuilder()
    pdf.draw_title_block(model)
    pdf.draw_section_heading("Summary")
    pdf.draw_table(
        ["Metric", "Value"],
        [(label, str(value)) for label, value in model["summary_rows"]],
        [320, 120],
    )

    if model["requirement_groups"]:
        pdf.draw_section_heading("Requirements")
        for group in model["requirement_groups"]:
            pdf.draw_section_heading(group["title"])
            pdf.draw_table(
                ["ID", "Requirement", "Priority"],
                [
                    (str(item["id"]), item["text"], item["priority"])
                    for item in group["items"]
                ],
                [30, 360, 70],
            )

    if model["narrative_text"]:
        pdf.draw_section_heading("Requirements Report")
        pdf.draw_paragraphs(model["narrative_text"])

    if model["mcq_sections"]:
        pdf.draw_section_heading("MCQ Results")
        for section in model["mcq_sections"]:
            pdf.draw_section_heading(section["question"])
            pdf.draw_table(
                ["Option", "Votes", "Share"],
                [
                    (option["option"], str(option["count"]), f'{option["percent"]}%')
                    for option in section["options"]
                ],
                [260, 80, 80],
            )

    if model["keywords"]:
        pdf.draw_section_heading("Keywords")
        pdf.draw_paragraphs(", ".join(model["keywords"]))

    if model["low_quality"]:
        pdf.draw_section_heading("Low Quality Responses")
        pdf.draw_table(
            ["ID", "Response"],
            [(str(i), item) for i, item in enumerate(model["low_quality"], start=1)],
            [40, 420],
        )

    if model["spelling_corrections"]:
        pdf.draw_section_heading("Spelling Corrections")
        pdf.draw_table(
            ["Original", "Corrected"],
            [(item["original"], item["corrected"]) for item in model["spelling_corrections"]],
            [220, 220],
        )

    if model["duplicates"]:
        pdf.draw_section_heading("Duplicate Requirements")
        pdf.draw_table(
            ["Requirement", "Similar To", "Match"],
            [
                (
                    dup.get("req1", ""),
                    dup.get("req2", ""),
                    f'{round(float(dup.get("similarity", 0)) * 100)}%',
                )
                for dup in model["duplicates"]
            ],
            [180, 180, 60],
        )

    return pdf.build()
