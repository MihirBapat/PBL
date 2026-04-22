
# GCI — Gig Cashflow Index

A full-stack financial analysis dashboard for evaluating the creditworthiness of gig economy workers using ML-powered income analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Recharts |
| Backend | FastAPI + SQLAlchemy + SQLite |
| ML Models | XGBoost, Isolation Forest, STL Decomposition |

---

## Project Structure

```
gci/
├── backend/
│   └── api/
│       └── main.py        # FastAPI app & all endpoints
├── frontend/
│   └── src/
│       ├── App.jsx        # Main React dashboard
│       └── index.css      # Styles
├── models/                # Pre-trained ML model .pkl files
├── data/                  # Sample transaction CSVs
├── scripts/               # Training scripts
├── venv/                  # Python virtual environment
└── gci_mvp.db             # SQLite database (auto-created)
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gci.git
cd gci
```

---

### 2. Backend Setup

Create and activate the virtual environment:

```bash
# Create venv
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows Bash / Git Bash)
source venv/Scripts/activate

# Activate (macOS / Linux)
source venv/bin/activate
```

Install dependencies:

```bash
pip install fastapi uvicorn sqlalchemy pandas numpy scikit-learn xgboost statsmodels joblib python-multipart
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

---

## Running the Project Locally

> Open **two separate terminals** — one for the backend, one for the frontend.

### Terminal 1 — Start Backend

**PowerShell (Windows):**
```powershell
cd gci
.\venv\Scripts\python.exe -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Bash / Git Bash (Windows):**
```bash
cd gci
./venv/Scripts/python.exe -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```

**macOS / Linux:**
```bash
cd gci
./venv/bin/python -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be live at: **`http://127.0.0.1:8000`**  
API docs available at: **`http://127.0.0.1:8000/docs`**

---

### Terminal 2 — Start Frontend

```bash
cd gci/frontend
npm run dev
```

Frontend will be live at: **`http://localhost:5173`**

---

## Port Conflict Fix

If port `8000` is already in use, run the backend on a different port:

```bash
./venv/Scripts/python.exe -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8001 --reload
```

Then update the API base URL in `frontend/src/App.jsx` (line 24):

```js
const API_BASE = 'http://127.0.0.1:8001';
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/borrowers` | List all borrowers |
| GET | `/borrower-report/{borrower_id}` | Full GCI report for a borrower |
| GET | `/gci/{borrower_id}` | GCI score & components |
| GET | `/temporal/{borrower_id}` | STL temporal decomposition data |
| GET | `/anomaly/{borrower_id}` | Anomaly score & manipulation flags |
| POST | `/upload-transactions` | Upload a CSV to run the full ML pipeline |

---

## Demo Borrowers

The database comes pre-seeded with three demo profiles:

| Borrower ID | Name | Occupation |
|---|---|---|
| `raju_patil` | Raju Patil | Swiggy Delivery Rider |
| `vikram_s` | Vikram S. | Ola Auto Driver |
| `meena_devi` | Meena Devi | Domestic Worker |
