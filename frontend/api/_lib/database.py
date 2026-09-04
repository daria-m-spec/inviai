"""Database setup, seeding, and helpers."""

from sqlmodel import SQLModel, Session, create_engine, select
from .models import (
    Practice, Patient, GoaeProcedure, Invoice, InvoiceLineItem,
    InvoiceExpense, InvoiceStatus, Anrede,
)
from datetime import date, timedelta
import os

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
