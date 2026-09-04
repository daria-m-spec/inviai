"""InviAI MCP Server — exposes invoice data to AI chat agents via FastMCP."""

from mcp.server.fastmcp import FastMCP
from sqlmodel import Session, select
from database import engine
from models import (
    Invoice, InvoiceLineItem, InvoiceExpense,
    Patient, Practice, InvoiceStatus,
)

mcp = FastMCP("InviAI", instructions="Invoice AI assistant for medical practices")


@mcp.tool()
def get_invoice_status(invoice_number: str) -> dict:
    """Get the current status and summary of an invoice by its number (e.g. RE-2026-0001).

    Returns: invoice number, status (German), total amount, due date, patient name,
    doctor name, and diagnosis.
    """
    with Session(engine) as s:
        inv = s.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
        if not inv:
            return {"error": f"Rechnung {invoice_number} nicht gefunden."}

        patient = s.get(Patient, inv.patient_id)
        practice = s.get(Practice, inv.practice_id)

        status_map = {
            "draft": "Entwurf", "sent": "Gesendet", "viewed": "Angesehen",
            "paid": "Bezahlt", "overdue": "Überfällig", "cancelled": "Storniert",
        }

        return {
            "invoice_number": inv.invoice_number,
            "status": status_map.get(inv.status.value, inv.status.value),
            "total": f"€{inv.total:.2f}",
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "issue_date": inv.issue_date.isoformat(),
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "—",
            "doctor_name": f"{practice.doctor_title} {practice.doctor_first_name} {practice.doctor_last_name}".strip() if practice else "—",
            "diagnosis": inv.diagnosis,
        }


@mcp.tool()
def get_doctor_info(invoice_number: str) -> dict:
    """Get the doctor and practice information for a given invoice.

    Returns: doctor name, specialization, practice name, address, phone, email.
    """
    with Session(engine) as s:
        inv = s.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
        if not inv:
            return {"error": f"Rechnung {invoice_number} nicht gefunden."}

        practice = s.get(Practice, inv.practice_id)
        if not practice:
            return {"error": "Praxisdaten nicht verfügbar."}

        return {
            "doctor_name": f"{practice.doctor_title} {practice.doctor_first_name} {practice.doctor_last_name}".strip(),
            "specialization": practice.specialization,
            "practice_name": practice.practice_name,
            "address": f"{practice.street}, {practice.postal_code} {practice.city}",
            "phone": practice.phone,
            "email": practice.email,
        }


@mcp.tool()
def get_procedures(invoice_number: str) -> dict:
    """Get the list of medical procedures (GOÄ line items) for an invoice.

    Returns: diagnosis, list of procedures with GOÄ number, description,
    date, base rate, multiplier, and amount.
    """
    with Session(engine) as s:
        inv = s.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
        if not inv:
            return {"error": f"Rechnung {invoice_number} nicht gefunden."}

        items = s.exec(
            select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == inv.id)
        ).all()
        expenses = s.exec(
            select(InvoiceExpense).where(InvoiceExpense.invoice_id == inv.id)
        ).all()

        return {
            "invoice_number": inv.invoice_number,
            "diagnosis": inv.diagnosis,
            "procedures": [
                {
                    "goae_number": li.goae_number,
                    "description": li.description,
                    "service_date": li.service_date.isoformat(),
                    "base_rate": f"€{li.base_rate:.2f}",
                    "multiplier": f"{li.multiplier:.2f}×",
                    "amount": f"€{li.amount:.2f}",
                }
                for li in items
            ],
            "expenses": [
                {"description": e.description, "amount": f"€{e.amount:.2f}"}
                for e in expenses
            ],
            "subtotal_services": f"€{inv.subtotal_services:.2f}",
            "subtotal_expenses": f"€{inv.subtotal_expenses:.2f}",
            "total": f"€{inv.total:.2f}",
        }


@mcp.tool()
def get_payment_link(invoice_number: str) -> dict:
    """Get the payment link and bank details for an invoice.

    Returns: payment URL, bank name, IBAN, BIC, reference number, amount, and status.
    """
    import os
    base_url = os.getenv("INVIAI_BASE_URL", "http://localhost:8000")

    with Session(engine) as s:
        inv = s.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
        if not inv:
            return {"error": f"Rechnung {invoice_number} nicht gefunden."}

        practice = s.get(Practice, inv.practice_id)

        status_map = {
            "draft": "Entwurf", "sent": "Gesendet", "viewed": "Angesehen",
            "paid": "Bezahlt", "overdue": "Überfällig", "cancelled": "Storniert",
        }

        result = {
            "payment_url": f"{base_url}/api/pay/{inv.invoice_number}",
            "amount": f"€{inv.total:.2f}",
            "status": status_map.get(inv.status.value, inv.status.value),
            "reference": inv.invoice_number,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
        }

        if practice:
            result.update({
                "bank_name": practice.bank_name,
                "iban": practice.iban,
                "bic": practice.bic,
            })

        if inv.status == InvoiceStatus.PAID:
            result["note"] = "Diese Rechnung wurde bereits bezahlt."

        return result


@mcp.tool()
def list_patient_invoices(patient_name: str) -> dict:
    """List all invoices for a patient by name (first or last name search).

    Returns: list of invoices with number, date, amount, and status.
    """
    with Session(engine) as s:
        patients = s.exec(
            select(Patient).where(
                Patient.first_name.contains(patient_name) |
                Patient.last_name.contains(patient_name)
            )
        ).all()

        if not patients:
            return {"error": f"Kein Patient mit dem Namen '{patient_name}' gefunden."}

        all_invoices = []
        for patient in patients:
            invoices = s.exec(
                select(Invoice).where(Invoice.patient_id == patient.id)
                .order_by(Invoice.issue_date.desc())
            ).all()

            status_map = {
                "draft": "Entwurf", "sent": "Gesendet", "viewed": "Angesehen",
                "paid": "Bezahlt", "overdue": "Überfällig", "cancelled": "Storniert",
            }

            for inv in invoices:
                all_invoices.append({
                    "invoice_number": inv.invoice_number,
                    "patient_name": f"{patient.first_name} {patient.last_name}",
                    "issue_date": inv.issue_date.isoformat(),
                    "total": f"€{inv.total:.2f}",
                    "status": status_map.get(inv.status.value, inv.status.value),
                })

        return {"invoices": all_invoices, "count": len(all_invoices)}


if __name__ == "__main__":
    mcp.run(transport="stdio")
