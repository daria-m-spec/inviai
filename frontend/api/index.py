"""InviAI — combined FastAPI backend for Vercel (single-file entrypoint).

Models, database, PDF generation, and routes are kept in one file because
Vercel's Python builder treats every .py file under api/ as a candidate
function entrypoint; a single file avoids any ambiguity in that detection.
"""

from datetime import date, datetime, timedelta
from enum import Enum
from pathlib import Path
import io
import os
import tempfile

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from sqlmodel import SQLModel, Session, Field, Relationship, create_engine, select
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


# ── Models ──

# ── Enums ──

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Anrede(str, Enum):
    HERR = "Herr"
    FRAU = "Frau"
    DIVERS = "Divers"


# ── Practice / Doctor (settings, one per account) ──

class Practice(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    doctor_title: str = ""                    # e.g. "Dr. med."
    doctor_first_name: str
    doctor_last_name: str
    specialization: str = ""                  # e.g. "Facharzt für Innere Medizin"
    practice_name: str = ""
    street: str = ""
    postal_code: str = ""
    city: str = "Berlin"
    phone: str = ""
    email: str = ""
    steuernummer: str = ""
    ust_id: str = ""
    iban: str = ""
    bic: str = ""
    bank_name: str = ""
    logo_url: str = ""


# ── Patient ──

class Patient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    anrede: Anrede = Anrede.HERR
    first_name: str
    last_name: str
    date_of_birth: date | None = None
    street: str = ""
    postal_code: str = ""
    city: str = ""
    insurance_number: str = ""
    email: str = ""


# ── GOÄ Procedure Catalog ──

class GoaeProcedure(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    goae_number: str = Field(index=True)       # e.g. "1", "5", "75"
    description: str                           # Beratung, Untersuchung, etc.
    base_rate: float                           # Einfachsatz in EUR
    category: str = ""                         # Persönlich / Technisch
    min_duration: str = ""                     # e.g. "10 min"
    threshold_factor: float = 2.3              # Above this → justification needed


# ── Invoice ──

class Invoice(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    invoice_number: str = Field(index=True, unique=True)   # RE-2026-0001
    issue_date: date = Field(default_factory=date.today)
    due_date: date | None = None
    status: InvoiceStatus = InvoiceStatus.DRAFT
    diagnosis: str = ""

    # Foreign keys
    practice_id: int | None = Field(default=None, foreign_key="practice.id")
    patient_id: int | None = Field(default=None, foreign_key="patient.id")

    # Totals (computed, stored for quick access)
    subtotal_services: float = 0.0
    subtotal_expenses: float = 0.0
    vat_rate: float = 0.0                     # 0 for Heilbehandlung, 19 otherwise
    vat_amount: float = 0.0
    total: float = 0.0

    notes: str = ""
    payment_note: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    line_items: list["InvoiceLineItem"] = Relationship(back_populates="invoice")
    expenses: list["InvoiceExpense"] = Relationship(back_populates="invoice")


# ── Invoice Line Item (one GOÄ procedure per line) ──

class InvoiceLineItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="invoice.id")
    goae_number: str                           # GOÄ code
    description: str                           # From catalog or custom
    service_date: date = Field(default_factory=date.today)
    quantity: int = 1
    base_rate: float                           # Einfachsatz
    multiplier: float = 2.3                    # Steigerungsfaktor
    justification: str = ""                    # Required when multiplier > threshold
    is_verlangen: bool = False                 # Patient-requested service
    amount: float = 0.0                        # Computed: base_rate * multiplier * qty

    invoice: Invoice | None = Relationship(back_populates="line_items")


# ── Invoice Expense (Auslagen) ──

class InvoiceExpense(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="invoice.id")
    description: str                           # Medikamente, Verbandmaterial, etc.
    amount: float
    receipt_required: bool = False             # Auto-set when > 25.56 EUR

    invoice: Invoice | None = Relationship(back_populates="expenses")


# ── Pydantic request/response schemas ──

class LineItemCreate(BaseModel):
    goae_number: str
    description: str = ""
    service_date: date | None = None
    quantity: int = 1
    base_rate: float
    multiplier: float = 2.3
    justification: str = ""
    is_verlangen: bool = False


class ExpenseCreate(BaseModel):
    description: str
    amount: float


class PatientCreate(BaseModel):
    anrede: Anrede = Anrede.HERR
    first_name: str
    last_name: str
    date_of_birth: date | None = None
    street: str = ""
    postal_code: str = ""
    city: str = ""
    insurance_number: str = ""
    email: str = ""


class InvoiceCreate(BaseModel):
    patient_id: int
    diagnosis: str = ""
    issue_date: date | None = None
    due_date: date | None = None
    vat_rate: float = 0.0
    notes: str = ""
    line_items: list[LineItemCreate] = []
    expenses: list[ExpenseCreate] = []


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    issue_date: date
    due_date: date | None
    status: str
    diagnosis: str
    patient_name: str
    doctor_name: str
    subtotal_services: float
    subtotal_expenses: float
    vat_rate: float
    vat_amount: float
    total: float
    notes: str
    line_items: list[dict]
    expenses: list[dict]
    pdf_url: str
    payment_url: str
    chat_url: str


# ── Database ──

# On Vercel's serverless runtime only /tmp is writable, so fall back there
# automatically when no explicit INVIAI_DB is set. Local/self-hosted runs are
# unaffected since VERCEL is only set in that environment.
_default_db_path = "/tmp/inviai.db" if os.getenv("VERCEL") else "inviai.db"
DB_PATH = os.getenv("INVIAI_DB", _default_db_path)
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def next_invoice_number(session: Session) -> str:
    """Generate sequential invoice number: RE-YYYY-NNNN."""
    year = date.today().year
    prefix = f"RE-{year}-"
    stmt = select(Invoice).where(Invoice.invoice_number.startswith(prefix))
    existing = session.exec(stmt).all()
    next_num = len(existing) + 1
    return f"{prefix}{next_num:04d}"


# ── Seed data ──

GOAE_CATALOG = [
    ("1", "Beratung", 4.66, "Persönlich", ""),
    ("3", "Eingehende Beratung (>10 min)", 8.74, "Persönlich", "10 min"),
    ("5", "Symptombezogene Untersuchung", 4.66, "Persönlich", ""),
    ("6", "Vollständige körperliche Untersuchung (mind. 1 Organsystem)", 5.83, "Persönlich", ""),
    ("7", "Vollständige körperliche Untersuchung (mehrere Organsysteme)", 8.74, "Persönlich", ""),
    ("8", "Ganzkörperuntersuchung", 15.15, "Persönlich", ""),
    ("34", "Erörterung der Auswirkungen einer Krankheit", 17.49, "Persönlich", "20 min"),
    ("75", "Ausführlicher Arztbericht", 7.58, "Persönlich", ""),
    ("250", "Blutentnahme venös", 2.33, "Technisch", ""),
    ("410", "Ultraschalluntersuchung eines Organs", 11.66, "Technisch", ""),
    ("420", "Ultraschalluntersuchung von bis zu 3 Organen", 29.14, "Technisch", ""),
    ("602", "Oxymetrische Untersuchung (Pulsoxymetrie)", 8.16, "Technisch", ""),
    ("651", "EKG Ruhe-EKG", 14.75, "Technisch", ""),
    ("652", "EKG Belastungs-EKG", 25.94, "Technisch", ""),
    ("3501", "Laboruntersuchung Blutbild (klein)", 3.50, "Technisch", ""),
    ("3550", "Laboruntersuchung Blutzucker", 2.33, "Technisch", ""),
    ("3585", "Laboruntersuchung Cholesterin", 2.33, "Technisch", ""),
]

SAMPLE_PATIENTS = [
    (Anrede.HERR, "Thomas", "Weber", "1978-05-14", "Friedrichstr. 42", "10117", "Berlin", "", "thomas.weber@mail.de"),
    (Anrede.FRAU, "Anna", "Schneider", "1985-11-22", "Kantstr. 15", "10623", "Berlin", "K123456789", "anna.schneider@mail.de"),
    (Anrede.FRAU, "Maria", "Becker", "1992-03-08", "Prenzlauer Allee 88", "10405", "Berlin", "", "maria.becker@mail.de"),
    (Anrede.HERR, "Jan", "Fischer", "1968-09-30", "Kurfürstendamm 120", "10711", "Berlin", "F987654321", "jan.fischer@mail.de"),
]


def seed_db():
    """Populate with demo data if empty."""
    with Session(engine) as s:
        # Practice
        if not s.exec(select(Practice)).first():
            s.add(Practice(
                doctor_title="Dr. med.",
                doctor_first_name="Sarah",
                doctor_last_name="Mitchell",
                specialization="Fachärztin für Innere Medizin",
                practice_name="Praxis Dr. Mitchell",
                street="Unter den Linden 25",
                postal_code="10117",
                city="Berlin",
                phone="+49 30 1234567",
                email="praxis@dr-mitchell.de",
                steuernummer="27/123/45678",
                iban="DE89 3704 0044 0532 0130 00",
                bic="COBADEFFXXX",
                bank_name="Commerzbank",
            ))
            s.commit()

        # GOÄ catalog
        if not s.exec(select(GoaeProcedure)).first():
            for num, desc, rate, cat, dur in GOAE_CATALOG:
                threshold = 1.8 if cat == "Technisch" else 2.3
                s.add(GoaeProcedure(
                    goae_number=num, description=desc, base_rate=rate,
                    category=cat, min_duration=dur, threshold_factor=threshold,
                ))
            s.commit()

        # Patients
        if not s.exec(select(Patient)).first():
            for anrede, first, last, dob, street, plz, city, ins, email in SAMPLE_PATIENTS:
                s.add(Patient(
                    anrede=anrede, first_name=first, last_name=last,
                    date_of_birth=date.fromisoformat(dob),
                    street=street, postal_code=plz, city=city,
                    insurance_number=ins, email=email,
                ))
            s.commit()

        # Sample invoices
        if not s.exec(select(Invoice)).first():
            today = date.today()

            # Invoice 1 — paid
            inv1 = Invoice(
                invoice_number="RE-2026-0001",
                issue_date=today - timedelta(days=30),
                due_date=today - timedelta(days=0),
                status=InvoiceStatus.PAID,
                diagnosis="Routineuntersuchung",
                practice_id=1, patient_id=1,
                subtotal_services=96.05, subtotal_expenses=0,
                vat_rate=0, vat_amount=0, total=96.05,
            )
            s.add(inv1)
            s.commit()
            s.add(InvoiceLineItem(
                invoice_id=inv1.id, goae_number="1", description="Beratung",
                service_date=today - timedelta(days=31),
                base_rate=4.66, multiplier=2.3, amount=10.72,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv1.id, goae_number="8", description="Ganzkörperuntersuchung",
                service_date=today - timedelta(days=31),
                base_rate=15.15, multiplier=2.3, amount=34.85,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv1.id, goae_number="651", description="EKG Ruhe-EKG",
                service_date=today - timedelta(days=31),
                base_rate=14.75, multiplier=1.8, amount=26.55,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv1.id, goae_number="250", description="Blutentnahme venös",
                service_date=today - timedelta(days=31),
                base_rate=2.33, multiplier=1.8, amount=4.19,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv1.id, goae_number="3501", description="Laboruntersuchung Blutbild (klein)",
                service_date=today - timedelta(days=31),
                base_rate=3.50, multiplier=1.15, amount=4.03,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv1.id, goae_number="3585", description="Laboruntersuchung Cholesterin",
                service_date=today - timedelta(days=31),
                base_rate=2.33, multiplier=1.15, amount=2.68,
            ))
            s.commit()

            # Invoice 2 — sent, awaiting payment
            inv2 = Invoice(
                invoice_number="RE-2026-0002",
                issue_date=today - timedelta(days=5),
                due_date=today + timedelta(days=25),
                status=InvoiceStatus.SENT,
                diagnosis="Akute Bronchitis",
                practice_id=1, patient_id=2,
                subtotal_services=139.02, subtotal_expenses=12.50,
                vat_rate=0, vat_amount=0, total=151.52,
            )
            s.add(inv2)
            s.commit()
            s.add(InvoiceLineItem(
                invoice_id=inv2.id, goae_number="3", description="Eingehende Beratung (>10 min)",
                service_date=today - timedelta(days=6),
                base_rate=8.74, multiplier=2.3, amount=20.10,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv2.id, goae_number="7",
                description="Vollständige körperliche Untersuchung (mehrere Organsysteme)",
                service_date=today - timedelta(days=6),
                base_rate=8.74, multiplier=2.3, amount=20.10,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv2.id, goae_number="410", description="Ultraschalluntersuchung eines Organs",
                service_date=today - timedelta(days=6),
                base_rate=11.66, multiplier=1.8, amount=20.99,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv2.id, goae_number="602",
                description="Oxymetrische Untersuchung (Pulsoxymetrie)",
                service_date=today - timedelta(days=6),
                base_rate=8.16, multiplier=1.8, amount=14.69,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv2.id, goae_number="250", description="Blutentnahme venös",
                service_date=today - timedelta(days=6),
                base_rate=2.33, multiplier=1.8, amount=4.19,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv2.id, goae_number="3501",
                description="Laboruntersuchung Blutbild (klein)",
                service_date=today - timedelta(days=6),
                base_rate=3.50, multiplier=1.15, amount=4.03,
            ))
            s.add(InvoiceExpense(
                invoice_id=inv2.id, description="Medikamente (Antibiotikum)",
                amount=12.50, receipt_required=False,
            ))
            s.commit()

            # Invoice 3 — draft
            inv3 = Invoice(
                invoice_number="RE-2026-0003",
                issue_date=today,
                due_date=today + timedelta(days=30),
                status=InvoiceStatus.DRAFT,
                diagnosis="Vorsorgeuntersuchung",
                practice_id=1, patient_id=3,
                subtotal_services=45.57, subtotal_expenses=0,
                vat_rate=0, vat_amount=0, total=45.57,
            )
            s.add(inv3)
            s.commit()
            s.add(InvoiceLineItem(
                invoice_id=inv3.id, goae_number="1", description="Beratung",
                service_date=today,
                base_rate=4.66, multiplier=2.3, amount=10.72,
            ))
            s.add(InvoiceLineItem(
                invoice_id=inv3.id, goae_number="8", description="Ganzkörperuntersuchung",
                service_date=today,
                base_rate=15.15, multiplier=2.3, amount=34.85,
            ))
            s.commit()


# ── PDF generation ──

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


# ── FastAPI app ──

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from datetime import date, timedelta
from pathlib import Path
import os

app = FastAPI(title="InviAI", version="0.1.0", description="Invoice AI platform for medical practices")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_vercel_url = os.getenv("VERCEL_URL")
_default_base_url = f"https://{_vercel_url}" if _vercel_url else "http://localhost:8000"
BASE_URL = os.getenv("INVIAI_BASE_URL", _default_base_url)

# Vercel's Python ASGI wrapper may not always invoke lifespan/startup events on
# cold start, so initialize eagerly at import time as well.
init_db()
seed_db()


@app.on_event("startup")
def startup():
    init_db()
    seed_db()


# ── Helpers ──

def _build_response(inv: Invoice, session: Session) -> InvoiceResponse:
    patient = session.get(Patient, inv.patient_id)
    practice = session.get(Practice, inv.practice_id)
    items = session.exec(
        select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == inv.id)
    ).all()
    expenses = session.exec(
        select(InvoiceExpense).where(InvoiceExpense.invoice_id == inv.id)
    ).all()

    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "—"
    doctor_name = f"{practice.doctor_title} {practice.doctor_first_name} {practice.doctor_last_name}".strip() if practice else "—"

    return InvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        status=inv.status.value,
        diagnosis=inv.diagnosis,
        patient_name=patient_name,
        doctor_name=doctor_name,
        subtotal_services=inv.subtotal_services,
        subtotal_expenses=inv.subtotal_expenses,
        vat_rate=inv.vat_rate,
        vat_amount=inv.vat_amount,
        total=inv.total,
        notes=inv.notes,
        line_items=[
            {
                "goae_number": li.goae_number,
                "description": li.description,
                "service_date": li.service_date.isoformat(),
                "quantity": li.quantity,
                "base_rate": li.base_rate,
                "multiplier": li.multiplier,
                "justification": li.justification,
                "is_verlangen": li.is_verlangen,
                "amount": li.amount,
            }
            for li in items
        ],
        expenses=[
            {"description": e.description, "amount": e.amount, "receipt_required": e.receipt_required}
            for e in expenses
        ],
        pdf_url=f"{BASE_URL}/api/invoices/{inv.id}/pdf",
        payment_url=f"{BASE_URL}/api/pay/{inv.invoice_number}",
        chat_url=f"{BASE_URL}/api/chat/{inv.invoice_number}",
    )


# ── Invoice CRUD ──

@app.get("/api/invoices", response_model=list[InvoiceResponse])
def list_invoices(session: Session = Depends(get_session)):
    invoices = session.exec(select(Invoice).order_by(Invoice.issue_date.desc())).all()
    return [_build_response(inv, session) for inv in invoices]


@app.get("/api/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, session: Session = Depends(get_session)):
    inv = session.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return _build_response(inv, session)


@app.get("/api/invoices/by-number/{invoice_number}", response_model=InvoiceResponse)
def get_invoice_by_number(invoice_number: str, session: Session = Depends(get_session)):
    inv = session.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return _build_response(inv, session)


@app.post("/api/invoices", response_model=InvoiceResponse)
def create_invoice(data: InvoiceCreate, session: Session = Depends(get_session)):
    patient = session.get(Patient, data.patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")

    practice = session.exec(select(Practice)).first()
    inv_number = next_invoice_number(session)

    inv = Invoice(
        invoice_number=inv_number,
        issue_date=data.issue_date or date.today(),
        due_date=data.due_date or (date.today() + timedelta(days=30)),
        status=InvoiceStatus.DRAFT,
        diagnosis=data.diagnosis,
        practice_id=practice.id if practice else None,
        patient_id=data.patient_id,
        vat_rate=data.vat_rate,
        notes=data.notes,
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)

    subtotal_services = 0.0
    for li_data in data.line_items:
        amount = li_data.base_rate * li_data.multiplier * li_data.quantity
        li = InvoiceLineItem(
            invoice_id=inv.id,
            goae_number=li_data.goae_number,
            description=li_data.description,
            service_date=li_data.service_date or date.today(),
            quantity=li_data.quantity,
            base_rate=li_data.base_rate,
            multiplier=li_data.multiplier,
            justification=li_data.justification,
            is_verlangen=li_data.is_verlangen,
            amount=round(amount, 2),
        )
        session.add(li)
        subtotal_services += li.amount

    subtotal_expenses = 0.0
    for exp_data in data.expenses:
        exp = InvoiceExpense(
            invoice_id=inv.id,
            description=exp_data.description,
            amount=exp_data.amount,
            receipt_required=exp_data.amount > 25.56,
        )
        session.add(exp)
        subtotal_expenses += exp.amount

    vat_amount = round((subtotal_services + subtotal_expenses) * data.vat_rate / 100, 2)
    inv.subtotal_services = round(subtotal_services, 2)
    inv.subtotal_expenses = round(subtotal_expenses, 2)
    inv.vat_amount = vat_amount
    inv.total = round(subtotal_services + subtotal_expenses + vat_amount, 2)
    session.add(inv)
    session.commit()
    session.refresh(inv)

    return _build_response(inv, session)


@app.patch("/api/invoices/{invoice_id}/status")
def update_status(invoice_id: int, status: str, session: Session = Depends(get_session)):
    inv = session.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = InvoiceStatus(status)
    session.add(inv)
    session.commit()
    return {"ok": True, "status": inv.status.value}


# ── Patient CRUD ──

@app.get("/api/patients")
def list_patients(q: str = "", session: Session = Depends(get_session)):
    stmt = select(Patient)
    if q:
        stmt = stmt.where(
            Patient.first_name.contains(q) | Patient.last_name.contains(q)
        )
    return session.exec(stmt).all()


@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: int, session: Session = Depends(get_session)):
    p = session.get(Patient, patient_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


@app.post("/api/patients", response_model=Patient)
def create_patient(data: PatientCreate, session: Session = Depends(get_session)):
    patient = Patient(**data.model_dump())
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


# ── GOÄ Catalog ──

@app.get("/api/procedures")
def list_procedures(q: str = "", session: Session = Depends(get_session)):
    stmt = select(GoaeProcedure)
    if q:
        stmt = stmt.where(
            GoaeProcedure.goae_number.contains(q) | GoaeProcedure.description.contains(q)
        )
    return session.exec(stmt.order_by(GoaeProcedure.goae_number)).all()


# ── Practice settings ──

@app.get("/api/practice")
def get_practice(session: Session = Depends(get_session)):
    return session.exec(select(Practice)).first()


# ── PDF generation ──

@app.get("/api/invoices/{invoice_id}/pdf")
def download_pdf(invoice_id: int, session: Session = Depends(get_session)):
    inv = session.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")

    resp = _build_response(inv, session)
    practice = session.get(Practice, inv.practice_id)
    patient = session.get(Patient, inv.patient_id)

    pdf_path = generate_invoice_pdf(resp, practice, patient, BASE_URL)
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"{inv.invoice_number}.pdf")


# ── Payment page (mock) ──

@app.get("/api/pay/{invoice_number}", response_class=HTMLResponse)
def payment_page(invoice_number: str, session: Session = Depends(get_session)):
    inv = session.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    resp = _build_response(inv, session)

    paid_class = "paid" if inv.status == InvoiceStatus.PAID else ""
    status_label = {
        "draft": "Entwurf", "sent": "Gesendet", "viewed": "Angesehen",
        "paid": "Bezahlt", "overdue": "Überfällig", "cancelled": "Storniert",
    }.get(inv.status.value, inv.status.value)

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rechnung {invoice_number} — InviAI</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Satoshi',system-ui,sans-serif;background:#F9FAFB;color:#141414;min-height:100vh;display:flex;align-items:center;justify-content:center}}
.card{{background:#fff;border-radius:16px;padding:40px;max-width:440px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.08)}}
.logo{{color:#216A56;font-weight:700;font-size:20px;margin-bottom:24px}}
.label{{font-size:13px;color:#6b7280;margin-bottom:4px}}
.value{{font-size:18px;font-weight:600;margin-bottom:16px}}
.total{{font-size:32px;font-weight:700;color:#141414;margin:20px 0}}
.status{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:20px}}
.status.sent,.status.viewed{{background:#DDF8F1;color:#047857}}
.status.paid{{background:#d1fae5;color:#166534}}
.status.overdue{{background:#fee2e2;color:#991b1b}}
.status.draft{{background:#F3F4F6;color:#6b7280}}
.btn{{display:block;width:100%;padding:14px;background:#216A56;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;text-align:center;margin-top:16px}}
.btn:hover{{background:#1a5545}}
.btn:disabled{{background:#9ca3af;cursor:default}}
.divider{{height:1px;background:#F3F4F6;margin:20px 0}}
.info{{font-size:13px;color:#6b7280;text-align:center;margin-top:16px}}
</style>
</head>
<body>
<div class="card">
  <div class="logo">InviAI</div>
  <div class="label">Rechnung</div>
  <div class="value">{invoice_number}</div>
  <div class="label">Patient</div>
  <div class="value">{resp.patient_name}</div>
  <div class="label">Arzt</div>
  <div class="value">{resp.doctor_name}</div>
  <div class="divider"></div>
  <div class="label">Gesamtbetrag</div>
  <div class="total">€{resp.total:.2f}</div>
  <span class="status {inv.status.value}">{status_label}</span>
  <div class="label">Fällig am</div>
  <div class="value">{resp.due_date or '—'}</div>
  {'<button class="btn" disabled>Bereits bezahlt</button>' if inv.status == InvoiceStatus.PAID else f'<button class="btn" onclick="pay()">Jetzt bezahlen</button>'}
  <div class="info">Sichere Zahlung über InviAI</div>
</div>
<script>
function pay() {{
  fetch('/api/invoices/{inv.id}/status?status=paid', {{method:'PATCH'}})
    .then(()=>{{ location.reload() }})
}}
</script>
</body></html>"""


# ── Chat widget page ──

@app.get("/api/chat/{invoice_number}", response_class=HTMLResponse)
def chat_page(invoice_number: str, session: Session = Depends(get_session)):
    inv = session.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    resp = _build_response(inv, session)

    status_de = {
        "draft": "Entwurf", "sent": "Gesendet", "viewed": "Angesehen",
        "paid": "Bezahlt", "overdue": "Überfällig", "cancelled": "Storniert",
    }.get(inv.status.value, inv.status.value)

    procedures_text = ", ".join(
        [f'{li["goae_number"]} – {li["description"]}' for li in resp.line_items]
    )

    return _chat_html(invoice_number, resp, status_de, procedures_text)


def _chat_html(inv_num, resp, status_de, procedures_text):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>InviAI Chat — {inv_num}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Satoshi',system-ui,sans-serif;background:#F0FBF8;min-height:100vh;display:flex;flex-direction:column}}
.header{{background:#216A56;color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px}}
.header .logo{{font-weight:700;font-size:18px}}
.header .sub{{font-size:13px;opacity:.8}}
.chat{{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}}
.msg{{max-width:85%;padding:12px 16px;border-radius:14px;font-size:15px;line-height:1.5}}
.msg.bot{{background:#fff;color:#141414;align-self:flex-start;border:1px solid #E0DFDE;border-bottom-left-radius:4px}}
.msg.user{{background:#216A56;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}}
.actions{{display:flex;flex-wrap:wrap;gap:8px;padding:0 20px 12px}}
.action-btn{{background:#fff;border:1px solid #d1d5db;border-radius:20px;padding:8px 16px;font-size:14px;cursor:pointer;color:#141414;font-family:inherit}}
.action-btn:hover{{background:#DDF8F1;border-color:#216A56;color:#216A56}}
.input-bar{{display:flex;gap:8px;padding:12px 20px;background:#fff;border-top:1px solid #E0DFDE}}
.input-bar input{{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;font-size:15px;font-family:inherit;outline:none}}
.input-bar input:focus{{border-color:#216A56}}
.input-bar button{{background:#216A56;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;font-family:inherit}}
.input-bar button:hover{{background:#1a5545}}
.typing{{color:#6b7280;font-style:italic;font-size:14px;padding:0 20px 8px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">InviAI Assistent</div>
    <div class="sub">Rechnung {inv_num}</div>
  </div>
</div>

<div class="chat" id="chat">
  <div class="msg bot">
    Hallo! Ihre Rechnung <strong>{inv_num}</strong> über <strong>€{resp.total:.2f}</strong> von <strong>{resp.doctor_name}</strong>.<br><br>
    Status: <strong>{status_de}</strong><br>
    {'Fällig am: <strong>' + str(resp.due_date) + '</strong>' if resp.due_date else ''}
    <br><br>Wie kann ich Ihnen helfen?
  </div>
</div>

<div class="actions" id="actions">
  <button class="action-btn" onclick="ask('ref')">Referenznummer</button>
  <button class="action-btn" onclick="ask('doctor')">Arztinformationen</button>
  <button class="action-btn" onclick="ask('procedures')">Behandlungsdetails</button>
  <button class="action-btn" onclick="ask('pay')">Rechnung bezahlen</button>
  <button class="action-btn" onclick="ask('contact')">Praxis kontaktieren</button>
</div>

<div class="input-bar">
  <input id="userInput" placeholder="Nachricht eingeben..." onkeydown="if(event.key==='Enter')send()">
  <button onclick="send()">Senden</button>
</div>

<script>
const DATA = {{
  inv_num: "{inv_num}",
  total: "{resp.total:.2f}",
  status: "{status_de}",
  doctor: "{resp.doctor_name}",
  patient: "{resp.patient_name}",
  due: "{resp.due_date or '—'}",
  diagnosis: "{resp.diagnosis}",
  procedures: "{procedures_text}",
  payment_url: "{resp.payment_url}",
}};

const REPLIES = {{
  ref: `Die Referenznummer Ihrer Rechnung ist <strong>${{DATA.inv_num}}</strong>. Bitte geben Sie diese Nummer bei Ihrer Überweisung an.`,
  doctor: `Ihre Behandlung wurde von <strong>${{DATA.doctor}}</strong> durchgeführt.\\n\\nPraxis Dr. Mitchell\\nUnter den Linden 25\\n10117 Berlin\\nTel: +49 30 1234567\\nE-Mail: praxis@dr-mitchell.de`,
  procedures: `Diagnose: <strong>${{DATA.diagnosis}}</strong>\\n\\nDurchgeführte Leistungen:\\n${{DATA.procedures}}\\n\\nGesamtbetrag: <strong>€${{DATA.total}}</strong>`,
  pay: `Sie können Ihre Rechnung über <strong>€${{DATA.total}}</strong> direkt online bezahlen:\\n\\n<a href="${{DATA.payment_url}}" target="_blank" style="color:#216A56;font-weight:600">→ Jetzt bezahlen</a>\\n\\nOder per Überweisung mit Referenz <strong>${{DATA.inv_num}}</strong>.`,
  contact: `Sie können die Praxis direkt kontaktieren:\\n\\n📞 +49 30 1234567\\n✉️ praxis@dr-mitchell.de\\n\\nPraxis Dr. Mitchell\\nUnter den Linden 25, 10117 Berlin`,
}};

function addMsg(text, isUser) {{
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = 'msg ' + (isUser ? 'user' : 'bot');
  div.innerHTML = text.replace(/\\n/g, '<br>');
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}}

function ask(key) {{
  const labels = {{ref:'Referenznummer?', doctor:'Arztinformationen?', procedures:'Behandlungsdetails?', pay:'Wie kann ich bezahlen?', contact:'Praxis kontaktieren'}};
  addMsg(labels[key], true);
  document.getElementById('actions').style.display = 'none';
  setTimeout(() => addMsg(REPLIES[key], false), 600);
}}

function send() {{
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;
  addMsg(text, true);
  input.value = '';
  document.getElementById('actions').style.display = 'none';

  // Simple keyword matching for prototype
  const lower = text.toLowerCase();
  let reply;
  if (lower.includes('referenz') || lower.includes('nummer') || lower.includes('reference'))
    reply = REPLIES.ref;
  else if (lower.includes('arzt') || lower.includes('doktor') || lower.includes('doctor') || lower.includes('name'))
    reply = REPLIES.doctor;
  else if (lower.includes('behandl') || lower.includes('prozedur') || lower.includes('leistung') || lower.includes('procedure'))
    reply = REPLIES.procedures;
  else if (lower.includes('bezahl') || lower.includes('zahl') || lower.includes('pay') || lower.includes('überw'))
    reply = REPLIES.pay;
  else if (lower.includes('kontakt') || lower.includes('praxis') || lower.includes('telefon') || lower.includes('email'))
    reply = REPLIES.contact;
  else if (lower.includes('status'))
    reply = `Der aktuelle Status Ihrer Rechnung <strong>${{DATA.inv_num}}</strong> ist: <strong>${{DATA.status}}</strong>.\\nGesamtbetrag: <strong>€${{DATA.total}}</strong>\\nFällig am: <strong>${{DATA.due}}</strong>`;
  else
    reply = `Ich verstehe Ihre Frage. Für die Rechnung <strong>${{DATA.inv_num}}</strong> kann ich Ihnen folgende Informationen geben:\\n\\n• Referenznummer\\n• Arztinformationen\\n• Behandlungsdetails\\n• Zahlungsoptionen\\n• Praxiskontakt\\n\\nWas möchten Sie wissen?`;

  setTimeout(() => addMsg(reply, false), 600);
}}
</script>
</body></html>"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
