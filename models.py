"""InviAI data models — SQLModel + Pydantic schemas."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
import uuid as _uuid


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

from pydantic import BaseModel


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
    patient_id: int
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
