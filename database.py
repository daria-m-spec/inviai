"""Database setup, seeding, and helpers."""

from sqlmodel import SQLModel, Session, create_engine, select
from models import (
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
    (Anrede.FRAU, "Lena", "Hoffmann", "1990-07-19", "Torstr. 55", "10119", "Berlin", "L456789123", "lena.hoffmann@mail.de"),
    (Anrede.HERR, "Michael", "Bauer", "1975-02-27", "Karl-Marx-Str. 210", "12043", "Berlin", "", "michael.bauer@mail.de"),
    (Anrede.FRAU, "Sophie", "Wagner", "1988-12-03", "Bergmannstr. 33", "10961", "Berlin", "S321654987", "sophie.wagner@mail.de"),
    (Anrede.HERR, "David", "Schulz", "1995-06-11", "Warschauer Str. 70", "10243", "Berlin", "", "david.schulz@mail.de"),
    (Anrede.FRAU, "Julia", "Krüger", "1982-04-25", "Danziger Str. 12", "10435", "Berlin", "J159753468", "julia.krueger@mail.de"),
    (Anrede.HERR, "Peter", "Zimmermann", "1965-10-08", "Schönhauser Allee 145", "10437", "Berlin", "", "peter.zimmermann@mail.de"),
]

# Each entry: (patient index into SAMPLE_PATIENTS, status, days since issue,
# days since due date — or None to default to issue date + 30, diagnosis,
# line items as (goae_number, quantity), expenses as (description, amount)).
# A positive "days since due date" means the due date is in the past
# (used for paid/overdue invoices); None means due 30 days after issue.
SAMPLE_INVOICES = [
    (0, InvoiceStatus.PAID, 35, 5, "Routineuntersuchung",
     [("1", 1), ("8", 1), ("651", 1), ("250", 1), ("3501", 1)], []),
    (1, InvoiceStatus.SENT, 10, None, "Akute Bronchitis",
     [("3", 1), ("410", 1), ("250", 1)], [("Medikamente (Antibiotikum)", 12.50)]),
    (2, InvoiceStatus.DRAFT, 0, None, "Vorsorgeuntersuchung",
     [("1", 1), ("8", 1)], []),
    (3, InvoiceStatus.PAID, 60, 30, "Kontrolluntersuchung nach OP",
     [("7", 1), ("651", 1), ("3501", 1)], []),
    (4, InvoiceStatus.OVERDUE, 45, 15, "Migräne Abklärung",
     [("34", 1), ("1", 1)], []),
    (5, InvoiceStatus.VIEWED, 5, None, "Rückenschmerzen",
     [("6", 1), ("652", 1)], []),
    (6, InvoiceStatus.CANCELLED, 20, None, "Erkältung",
     [("1", 1)], []),
    (7, InvoiceStatus.SENT, 3, None, "Sportverletzung Knie",
     [("7", 1), ("410", 1)], [("Verbandmaterial", 8.90)]),
    (8, InvoiceStatus.PAID, 90, 60, "Jahresuntersuchung",
     [("8", 1), ("651", 1), ("3501", 1), ("3550", 1), ("3585", 1)], []),
    (9, InvoiceStatus.DRAFT, 2, None, "Bluthochdruck Kontrolle",
     [("1", 1), ("602", 1)], []),
    (0, InvoiceStatus.SENT, 25, None, "Grippeimpfung",
     [("1", 1), ("250", 1)], [("Grippeimpfstoff", 18.30)]),
    (1, InvoiceStatus.OVERDUE, 50, 20, "Nachuntersuchung Bronchitis",
     [("3", 1)], []),
    (5, InvoiceStatus.PAID, 100, 70, "Check-up",
     [("7", 1), ("651", 1)], []),
    (6, InvoiceStatus.VIEWED, 8, None, "Hautausschlag",
     [("5", 1)], []),
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
            catalog = {num: (desc, rate, cat) for num, desc, rate, cat, _dur in GOAE_CATALOG}
            patients = s.exec(select(Patient).order_by(Patient.id)).all()

            for seq, (pat_idx, status, days_since_issue, days_since_due, diagnosis, items, expenses) in enumerate(SAMPLE_INVOICES, start=1):
                issue_date = today - timedelta(days=days_since_issue)
                due_date = (
                    today - timedelta(days=days_since_due)
                    if days_since_due is not None
                    else issue_date + timedelta(days=30)
                )

                subtotal_services = 0.0
                line_rows = []
                for goae_number, qty in items:
                    desc, rate, cat = catalog[goae_number]
                    multiplier = 1.8 if cat == "Technisch" else 2.3
                    amount = round(rate * multiplier * qty, 2)
                    subtotal_services += amount
                    line_rows.append((goae_number, desc, rate, multiplier, qty, amount))
                subtotal_services = round(subtotal_services, 2)
                subtotal_expenses = round(sum(amount for _desc, amount in expenses), 2)

                inv = Invoice(
                    invoice_number=f"RE-{today.year}-{seq:04d}",
                    issue_date=issue_date,
                    due_date=due_date,
                    status=status,
                    diagnosis=diagnosis,
                    practice_id=1,
                    patient_id=patients[pat_idx].id,
                    subtotal_services=subtotal_services,
                    subtotal_expenses=subtotal_expenses,
                    vat_rate=0, vat_amount=0,
                    total=round(subtotal_services + subtotal_expenses, 2),
                )
                s.add(inv)
                s.commit()

                for goae_number, desc, rate, multiplier, qty, amount in line_rows:
                    s.add(InvoiceLineItem(
                        invoice_id=inv.id, goae_number=goae_number, description=desc,
                        service_date=issue_date, quantity=qty,
                        base_rate=rate, multiplier=multiplier, amount=amount,
                    ))
                for desc, amount in expenses:
                    s.add(InvoiceExpense(
                        invoice_id=inv.id, description=desc, amount=amount,
                        receipt_required=amount > 25.56,
                    ))
                s.commit()
