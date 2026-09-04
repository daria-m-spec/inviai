# InviAI frontend

React + TypeScript + Vite app for the InviAI doctor UI (Invoices screen, GOÄ invoice creation, Catalogue). Talks to the FastAPI backend in the repo root over `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).

## Run locally

From the repo root, start the backend first:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Then, in `frontend/`:

```bash
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if the backend isn't on localhost:8000
npm run dev
```

Open the printed `localhost` URL. Creating and finalizing an invoice calls the real backend, generates a real PDF (with a payment QR and an AI-chat QR baked in via `pdf_generator.py`), and persists the patient/invoice to the SQLite database.

Note: for the QR codes in a generated PDF to be scannable from an actual phone, `INVIAI_BASE_URL` on the backend must point at a publicly reachable URL, not `localhost`.
