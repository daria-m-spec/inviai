"""InviAI — FastAPI backend for invoice management."""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from datetime import date, timedelta
from pathlib import Path
import os

from _lib.models import (
    Invoice, InvoiceLineItem, InvoiceExpense, InvoiceCreate,
    InvoiceResponse, InvoiceStatus, Patient, PatientCreate, Practice, GoaeProcedure,
)
from _lib.database import init_db, seed_db, get_session, next_invoice_number, engine

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

    from _lib.pdf_generator import generate_invoice_pdf
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
