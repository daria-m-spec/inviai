"""InviAI PDF Invoice Generator — GOÄ-compliant, branded layout with QR codes."""

import io
import os
import tempfile
from pathlib import Path

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    HRFlowable, KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ── Brand Colors ──
BRAND_PRIMARY = colors.HexColor("#216A56")
BRAND_LIGHT = colors.HexColor("#F0FBF8")
BRAND_BG = colors.HexColor("#F9FAFB")
TEXT_DARK = colors.HexColor("#141414")
TEXT_GRAY = colors.HexColor("#6b7280")
BORDER_COLOR = colors.HexColor("#E0DFDE")

WIDTH, HEIGHT = A4  # 210mm × 297mm


def _make_qr(url: str, size: int = 120) -> Image:
    """Generate a QR code image object for ReportLab."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                        error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#216A56", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Image(buf, width=size, height=size)


def _styles():
    """Build paragraph styles for the invoice."""
    ss = getSampleStyleSheet()

    base_font = "Helvetica"
    bold_font = "Helvetica-Bold"

    styles = {
        "logo": ParagraphStyle("logo", fontName=bold_font, fontSize=22,
                               textColor=BRAND_PRIMARY, spaceAfter=2),
        "h1": ParagraphStyle("h1", fontName=bold_font, fontSize=16,
                             textColor=TEXT_DARK, spaceAfter=6),
        "h2": ParagraphStyle("h2", fontName=bold_font, fontSize=11,
                             textColor=TEXT_DARK, spaceBefore=12, spaceAfter=4),
        "body": ParagraphStyle("body", fontName=base_font, fontSize=9.5,
                               textColor=TEXT_DARK, leading=14),
        "body_bold": ParagraphStyle("body_bold", fontName=bold_font, fontSize=9.5,
                                    textColor=TEXT_DARK, leading=14),
        "small": ParagraphStyle("small", fontName=base_font, fontSize=8,
                                textColor=TEXT_GRAY, leading=11),
        "small_bold": ParagraphStyle("small_bold", fontName=bold_font, fontSize=8,
                                     textColor=TEXT_GRAY, leading=11),
        "right": ParagraphStyle("right", fontName=base_font, fontSize=9.5,
                                textColor=TEXT_DARK, alignment=TA_RIGHT, leading=14),
        "right_bold": ParagraphStyle("right_bold", fontName=bold_font, fontSize=9.5,
                                     textColor=TEXT_DARK, alignment=TA_RIGHT, leading=14),
        "total": ParagraphStyle("total", fontName=bold_font, fontSize=13,
                                textColor=TEXT_DARK, alignment=TA_RIGHT),
        "center": ParagraphStyle("center", fontName=base_font, fontSize=8,
                                 textColor=TEXT_GRAY, alignment=TA_CENTER, leading=11),
        "footer": ParagraphStyle("footer", fontName=base_font, fontSize=7,
                                 textColor=TEXT_GRAY, leading=10, alignment=TA_CENTER),
    }
    return styles


def generate_invoice_pdf(invoice_resp, practice, patient, base_url: str) -> str:
    """
    Generate a branded PDF invoice.

    Args:
        invoice_resp: InvoiceResponse pydantic model
        practice: Practice SQLModel instance
        patient: Patient SQLModel instance
        base_url: Base URL for QR code links

    Returns:
        Path to generated PDF file
    """
    s = _styles()

    # Create temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf",
                                      prefix=f"invoice_{invoice_resp.invoice_number}_")
    tmp.close()

    doc = SimpleDocTemplate(
        tmp.name, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=15 * mm, bottomMargin=20 * mm,
    )

    elements = []
    usable_width = doc.width  # ~170mm

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # HEADER — Logo + Invoice meta
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    header_left = [
        Paragraph("InviAI", s["logo"]),
        Spacer(1, 2),
        Paragraph(f"{practice.practice_name}" if practice.practice_name else "", s["body"]),
        Paragraph(
            f"{practice.doctor_title} {practice.doctor_first_name} {practice.doctor_last_name}".strip(),
            s["body"]
        ),
        Paragraph(practice.specialization, s["small"]) if practice.specialization else Spacer(1, 1),
    ]

    status_labels = {
        "draft": "Entwurf", "sent": "Gesendet", "viewed": "Angesehen",
        "paid": "Bezahlt", "overdue": "Überfällig", "cancelled": "Storniert",
    }
    status_text = status_labels.get(invoice_resp.status, invoice_resp.status)

    header_right = [
        Paragraph(f"<b>RECHNUNG</b>", ParagraphStyle("inv_title", fontName="Helvetica-Bold",
                  fontSize=20, textColor=BRAND_PRIMARY, alignment=TA_RIGHT)),
        Spacer(1, 4),
        Paragraph(f"Nr. {invoice_resp.invoice_number}", ParagraphStyle("inv_num",
                  fontName="Helvetica", fontSize=10, textColor=TEXT_GRAY, alignment=TA_RIGHT)),
        Spacer(1, 4),
        Paragraph(f"Status: {status_text}", ParagraphStyle("inv_status",
                  fontName="Helvetica-Bold", fontSize=9, textColor=BRAND_PRIMARY, alignment=TA_RIGHT)),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[usable_width * 0.55, usable_width * 0.45],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 8 * mm))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # ADDRESS BLOCK — Practice (sender) + Patient (recipient)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # Sender line (small, above recipient)
    sender_line = f"{practice.practice_name} · {practice.street} · {practice.postal_code} {practice.city}"
    elements.append(Paragraph(sender_line, ParagraphStyle("sender", fontName="Helvetica",
                    fontSize=7, textColor=TEXT_GRAY, leading=9)))
    elements.append(Spacer(1, 3 * mm))

    # Patient address
    anrede_text = f"{patient.anrede.value} " if patient.anrede else ""
    elements.append(Paragraph(f"{anrede_text}{patient.first_name} {patient.last_name}", s["body_bold"]))
    if patient.street:
        elements.append(Paragraph(patient.street, s["body"]))
    if patient.postal_code or patient.city:
        elements.append(Paragraph(f"{patient.postal_code} {patient.city}".strip(), s["body"]))

    elements.append(Spacer(1, 10 * mm))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # INVOICE METADATA — Date, Due, Diagnosis
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    meta_data = [
        ["Rechnungsdatum:", _format_date(invoice_resp.issue_date),
         "Fällig am:", _format_date(invoice_resp.due_date) if invoice_resp.due_date else "—"],
    ]
    if patient.date_of_birth:
        meta_data.append([
            "Geb.-Datum Patient:", _format_date(patient.date_of_birth),
            "Versicherungsnr.:", patient.insurance_number or "—",
        ])
    if invoice_resp.diagnosis:
        meta_data.append([
            "Diagnose:", invoice_resp.diagnosis, "", "",
        ])

    meta_table = Table(meta_data, colWidths=[
        usable_width * 0.22, usable_width * 0.28,
        usable_width * 0.22, usable_width * 0.28,
    ])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 6 * mm))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # LINE ITEMS TABLE (GOÄ procedures)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    elements.append(Paragraph("Leistungen gemäß GOÄ", s["h2"]))

    col_widths = [
        usable_width * 0.09,   # GOÄ Nr.
        usable_width * 0.32,   # Beschreibung
        usable_width * 0.13,   # Datum
        usable_width * 0.11,   # Einfachsatz
        usable_width * 0.10,   # Faktor
        usable_width * 0.08,   # Anz.
        usable_width * 0.17,   # Betrag
    ]

    # Header row
    header_row = [
        Paragraph("<b>GOÄ</b>", s["small_bold"]),
        Paragraph("<b>Beschreibung</b>", s["small_bold"]),
        Paragraph("<b>Datum</b>", s["small_bold"]),
        Paragraph("<b>Einfachsatz</b>", s["small_bold"]),
        Paragraph("<b>Faktor</b>", s["small_bold"]),
        Paragraph("<b>Anz.</b>", s["small_bold"]),
        Paragraph("<b>Betrag €</b>", ParagraphStyle("amt_h", fontName="Helvetica-Bold",
                  fontSize=8, textColor=TEXT_GRAY, alignment=TA_RIGHT)),
    ]

    table_data = [header_row]

    for li in invoice_resp.line_items:
        row = [
            Paragraph(str(li["goae_number"]), s["body"]),
            Paragraph(li["description"], s["body"]),
            Paragraph(_format_date(li["service_date"]), s["small"]),
            Paragraph(f'{li["base_rate"]:.2f}', s["body"]),
            Paragraph(f'{li["multiplier"]:.2f}×', s["body"]),
            Paragraph(str(li["quantity"]), s["body"]),
            Paragraph(f'{li["amount"]:.2f}', s["right"]),
        ]
        table_data.append(row)

        # Add justification row if present
        if li.get("justification"):
            just_row = [
                "", Paragraph(f'<i>Begründung: {li["justification"]}</i>',
                             ParagraphStyle("just", fontName="Helvetica-Oblique",
                                           fontSize=7.5, textColor=TEXT_GRAY, leading=10)),
                "", "", "", "", "",
            ]
            table_data.append(just_row)

    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        # Header styling
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_DARK),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        # Grid
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, BRAND_PRIMARY),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, BORDER_COLOR),
        # Padding
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(items_table)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # EXPENSES (Auslagen) — if any
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if invoice_resp.expenses:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph("Auslagen (§ 10 GOÄ)", s["h2"]))

        exp_data = [[
            Paragraph("<b>Beschreibung</b>", s["small_bold"]),
            Paragraph("<b>Betrag €</b>", ParagraphStyle("exp_h", fontName="Helvetica-Bold",
                      fontSize=8, textColor=TEXT_GRAY, alignment=TA_RIGHT)),
        ]]
        for exp in invoice_resp.expenses:
            exp_data.append([
                Paragraph(exp["description"], s["body"]),
                Paragraph(f'{exp["amount"]:.2f}', s["right"]),
            ])

        exp_table = Table(exp_data, colWidths=[usable_width * 0.75, usable_width * 0.25])
        exp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_LIGHT),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, BRAND_PRIMARY),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(exp_table)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TOTALS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    elements.append(Spacer(1, 5 * mm))

    totals_data = [
        [Paragraph("Zwischensumme Leistungen:", s["right"]),
         Paragraph(f"€ {invoice_resp.subtotal_services:.2f}", s["right"])],
    ]
    if invoice_resp.subtotal_expenses > 0:
        totals_data.append([
            Paragraph("Zwischensumme Auslagen:", s["right"]),
            Paragraph(f"€ {invoice_resp.subtotal_expenses:.2f}", s["right"]),
        ])
    if invoice_resp.vat_rate > 0:
        totals_data.append([
            Paragraph(f"MwSt. ({invoice_resp.vat_rate:.0f}%):", s["right"]),
            Paragraph(f"€ {invoice_resp.vat_amount:.2f}", s["right"]),
        ])
    else:
        totals_data.append([
            Paragraph("Umsatzsteuer:", s["right"]),
            Paragraph("Umsatzsteuerbefreit (§ 4 Nr. 14a UStG)", ParagraphStyle(
                "vat_free", fontName="Helvetica-Oblique", fontSize=8,
                textColor=TEXT_GRAY, alignment=TA_RIGHT)),
        ])

    totals_data.append([
        Paragraph("<b>Gesamtbetrag:</b>", s["right_bold"]),
        Paragraph(f"<b>€ {invoice_resp.total:.2f}</b>", s["total"]),
    ])

    totals_table = Table(totals_data, colWidths=[usable_width * 0.65, usable_width * 0.35])
    totals_table.setStyle(TableStyle([
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, BRAND_PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(totals_table)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # PAYMENT INFO
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    elements.append(Spacer(1, 6 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
    elements.append(Spacer(1, 3 * mm))

    bank_text = (
        f"<b>Bankverbindung:</b> {practice.bank_name} · "
        f"IBAN: {practice.iban} · BIC: {practice.bic}<br/>"
        f"<b>Verwendungszweck:</b> {invoice_resp.invoice_number}"
    )
    elements.append(Paragraph(bank_text, s["small"]))

    if practice.steuernummer:
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(f"Steuernummer: {practice.steuernummer}", s["small"]))

    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        "Bitte überweisen Sie den Betrag innerhalb der Zahlungsfrist unter "
        "Angabe der Rechnungsnummer.",
        ParagraphStyle("pay_note", fontName="Helvetica", fontSize=9,
                      textColor=TEXT_DARK, leading=13),
    ))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # QR CODES — Payment + Chat
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    elements.append(Spacer(1, 8 * mm))

    payment_url = f"{base_url}/api/pay/{invoice_resp.invoice_number}"
    chat_url = f"{base_url}/api/chat/{invoice_resp.invoice_number}"

    qr_payment = _make_qr(payment_url, size=80)
    qr_chat = _make_qr(chat_url, size=80)

    qr_data = [[
        [qr_payment, Spacer(1, 4), Paragraph("Online bezahlen", s["center"])],
        Spacer(1, 1),
        [qr_chat, Spacer(1, 4), Paragraph("AI-Assistent", s["center"])],
    ]]

    qr_table = Table(qr_data, colWidths=[usable_width * 0.35, usable_width * 0.3, usable_width * 0.35])
    qr_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(qr_table)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # FOOTER — Legal / Practice info
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    elements.append(Spacer(1, 6 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.3, color=BORDER_COLOR))
    elements.append(Spacer(1, 2 * mm))

    footer_parts = [practice.practice_name, practice.street,
                    f"{practice.postal_code} {practice.city}"]
    if practice.phone:
        footer_parts.append(f"Tel: {practice.phone}")
    if practice.email:
        footer_parts.append(practice.email)
    footer_text = " · ".join(filter(None, footer_parts))
    elements.append(Paragraph(footer_text, s["footer"]))

    elements.append(Spacer(1, 1 * mm))
    elements.append(Paragraph(
        "Erstellt mit InviAI — Intelligente Rechnungsverwaltung für Arztpraxen",
        ParagraphStyle("branding", fontName="Helvetica-Oblique", fontSize=7,
                      textColor=BRAND_PRIMARY, alignment=TA_CENTER),
    ))

    # Build PDF
    doc.build(elements)
    return tmp.name


def _format_date(d) -> str:
    """Format a date object or ISO string to DD.MM.YYYY."""
    if d is None:
        return "—"
    if isinstance(d, str):
        from datetime import date as date_cls
        try:
            d = date_cls.fromisoformat(d)
        except ValueError:
            return d
    return d.strftime("%d.%m.%Y")
