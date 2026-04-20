import os
import json
import joblib
import pandas as pd
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Float, Integer, Text, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from statsmodels.tsa.seasonal import STL
import warnings

warnings.filterwarnings("ignore")

# ---------------------------------------------------------
# Database Setup (SQLite for MVP)
# ---------------------------------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./gci_mvp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class BorrowerDB(Base):
    __tablename__ = "borrowers"
    borrower_id = Column(String, primary_key=True, index=True)
    display_name = Column(String)
    gci_score = Column(Integer)
    pd_score = Column(Float)
    stability_score = Column(Float)
    liquidity_score = Column(Float)
    discipline_score = Column(Float)
    repayment_score = Column(Float)
    manipulation_label = Column(String)
    anomaly_score = Column(Float)
    flags_json = Column(Text)       # Stores M3 triggered flags
    temporal_json = Column(Text)    # Stores STL decomposition arrays
    report_json = Column(Text)      # Stores demo/report-ready lender dashboard payload

Base.metadata.create_all(bind=engine)

def ensure_optional_columns():
    """Add columns for existing SQLite databases created before newer fields."""
    with engine.begin() as conn:
        columns = conn.execute(text("PRAGMA table_info(borrowers)")).fetchall()
        column_names = {column[1] for column in columns}
        if "display_name" not in column_names:
            conn.execute(text("ALTER TABLE borrowers ADD COLUMN display_name VARCHAR"))
        if "report_json" not in column_names:
            conn.execute(text("ALTER TABLE borrowers ADD COLUMN report_json TEXT"))

ensure_optional_columns()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import __main__

# ---------------------------------------------------------
# Custom Classes Required for Model Unpickling
# ---------------------------------------------------------
class TemporalDecomposer:
    """M1: Wrapper for STL logic to maintain pipeline architecture"""
    def __init__(self):
        self.name = "STL_Decomposer_v1"
    def transform(self, df):
        return df

class FraudRuleEngine:
    """M3: Hard statistical rules engine in pure Python"""
    def __init__(self):
        self.thresholds = {'round_trip': 2, 'dormancy': 5.0}
    def predict(self, df):
        flags = []
        for _, row in df.iterrows():
            flag = 0
            if row['round_trip_count'] >= self.thresholds['round_trip']: flag += 1
            if row['dormancy_score'] > self.thresholds['dormancy']: flag += 1
            if row['expense_income_ratio'] < 0.2: flag += 1
            flags.append(1 if flag > 0 else 0)
        return np.array(flags)

# Trick pickle into finding these classes in the current Uvicorn __main__ namespace
__main__.TemporalDecomposer = TemporalDecomposer
__main__.FraudRuleEngine = FraudRuleEngine

# ---------------------------------------------------------
# Model Registry (Loaded at Startup)
# ---------------------------------------------------------
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Booting GCI Inference Engine...")
    try:
        # We load models strictly into memory once to avoid disk I/O on requests
        ml_models["m1"] = joblib.load("models/m1_temporal_decomposer.pkl")
        ml_models["m2"] = joblib.load("models/m2_isolation_forest.pkl")
        ml_models["m3"] = joblib.load("models/m3_fraud_rules.pkl")
        ml_models["m4"] = joblib.load("models/m4_xgboost_pd.pkl")
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Warning: Could not load models. Ensure train_all.py was run. Error: {e}")
    yield
    print("Shutting down GCI Engine.")

app = FastAPI(title="GCI Backend API", lifespan=lifespan)

# Allow React frontend to connect later
app.add_middleware(
    CORSMiddleware, # Correcting standard CORS middleware import concept for simple execution
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Helper: Feature Extraction & Scoring Engine
# ---------------------------------------------------------
def process_transactions(df: pd.DataFrame, borrower_id: str):
    """Replicates the feature engineering pipeline for a single live upload."""
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)
    df.sort_index(inplace=True)

    credits = df[df['direction'] == 'credit']
    debits = df[df['direction'] == 'debit']

    monthly_inc = credits['amount'].resample('ME').sum().fillna(0)
    monthly_exp = debits['amount'].resample('ME').sum().fillna(0)
    
    avg_inc = monthly_inc.mean()
    inc_vol = monthly_inc.std() / avg_inc if avg_inc > 0 else 0

    # Temporal Decomposition
    seasonal_arr, residual_arr, trend_arr = [], [], []
    cvd_variance = 0
    if len(monthly_inc) >= 6:
        try:
            stl = STL(monthly_inc, period=3, robust=True).fit()
            seasonal_arr = stl.seasonal.tolist()
            residual_arr = stl.resid.tolist()
            trend_arr = stl.trend.tolist()
            cvd_variance = np.var(stl.resid) / np.var(monthly_inc) if np.var(monthly_inc) > 0 else 0
        except:
            cvd_variance = inc_vol
            
    # Calculate Base Features
    avg_balance = df['balance_after_txn'].resample('ME').last().mean()
    weekly_exp = monthly_exp.mean() / 4.33
    liq_buffer = avg_balance / weekly_exp if weekly_exp > 0 else 12
    exp_inc_ratio = monthly_exp.mean() / avg_inc if avg_inc > 0 else 1
    rt_count = len(df[(df['amount'] > 5000) & (df['category'] == 'transfer')])
    
    cutoff_90d = df.index.max() - pd.Timedelta(days=90)
    recent_txns = len(df[df.index >= cutoff_90d])
    hist_txns = len(df[df.index < cutoff_90d])
    dormancy = recent_txns / (hist_txns / 3 + 1)
    
    weekly_inc = credits['amount'].resample('W').sum().fillna(0)
    hist_std = weekly_inc[weekly_inc.index < cutoff_90d].std()
    week_std_ratio = weekly_inc[weekly_inc.index >= cutoff_90d].std() / hist_std if hist_std > 0 else 1
    
    fest_txns = credits[credits['festival_window'].notnull()]
    fest_ratio = fest_txns['amount'].mean() / avg_inc if avg_inc > 0 and len(fest_txns) > 0 else 1.0

    features = pd.DataFrame([{
        'avg_monthly_income': avg_inc, 'income_volatility': inc_vol, 'cvd_residual_variance': cvd_variance,
        'liquidity_buffer_weeks': liq_buffer, 'expense_income_ratio': exp_inc_ratio, 'round_trip_count': rt_count,
        'dormancy_score': dormancy, 'weekly_std_ratio': week_std_ratio, 'festival_uplift_ratio': fest_ratio
    }])

    # Run ML Inference
    raw_decision = ml_models["m2"].decision_function(features)[0] # Negative means anomalous
    anomaly_score = float(np.clip(0.5 - raw_decision, 0.0, 1.0))
    is_anomaly = ml_models["m2"].predict(features)[0] # -1 if anomaly
    
    flags = ml_models["m3"].predict(features)[0]
    pd_prob = ml_models["m4"].predict_proba(features)[0][1] # Probability of Default (class 1)

    # GCI Blueprint Formula Calculations
    stability_score = max(0, 100 - (inc_vol * 100))
    liquidity_score = min(100, liq_buffer * 10)
    discipline_score = max(0, 100 - (exp_inc_ratio * 100))
    repayment_score = max(0, 100 - (pd_prob * 100))
    cvd_score = max(0, 100 - (cvd_variance * 100))
    
    manipulation_label = "Clean"
    penalty = 1.0
    if flags > 0 or is_anomaly == -1:
        if flags >= 2 or anomaly_score >= 0.60:
            manipulation_label = "High Risk"
            penalty = 0.50
        else:
            manipulation_label = "Suspicious"
            penalty = 0.75

    component_score = (
        stability_score * 0.30
        + liquidity_score * 0.25
        + repayment_score * 0.20
        + discipline_score * 0.15
        + cvd_score * 0.10
    )
    raw_gci = 300 + (component_score / 100) * 600
    final_gci = int(np.clip(raw_gci * penalty, 300, 900))

    return {
        "borrower_id": borrower_id,
        "display_name": borrower_id,
        "gci_score": final_gci,
        "pd_score": float(pd_prob),
        "stability_score": float(stability_score),
        "liquidity_score": float(liquidity_score),
        "discipline_score": float(discipline_score),
        "repayment_score": float(repayment_score),
        "manipulation_label": manipulation_label,
        "anomaly_score": float(anomaly_score),
        "flags_json": json.dumps({"triggered_rules": int(flags), "is_anomaly_forest": bool(is_anomaly == -1)}),
        "temporal_json": json.dumps({"raw": monthly_inc.tolist(), "seasonal": seasonal_arr, "residual": residual_arr, "trend": trend_arr})
    }

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.post("/upload-transactions")
async def upload_transactions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Ingests CSV, runs M1-M4 pipeline, calculates GCI, and persists to SQLite."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are permitted.")
    
    try:
        df = pd.read_csv(file.file)
        if 'borrower_id' not in df.columns:
            raise HTTPException(status_code=400, detail="CSV missing borrower_id column.")
        
        b_id = str(df['borrower_id'].iloc[0])
        result = process_transactions(df, b_id)
        
        # Upsert into SQLite
        db_record = db.query(BorrowerDB).filter(BorrowerDB.borrower_id == b_id).first()
        if db_record:
            for key, value in result.items():
                setattr(db_record, key, value)
        else:
            db_record = BorrowerDB(**result)
            db.add(db_record)
            
        db.commit()
        return {"status": "success", "borrower_id": b_id, "gci_score": result["gci_score"], "manipulation_label": result["manipulation_label"]}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gci/{borrower_id}")
def get_gci(borrower_id: str, db: Session = Depends(get_db)):
    record = db.query(BorrowerDB).filter(BorrowerDB.borrower_id == borrower_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return {
        "borrower_id": record.borrower_id,
        "display_name": record.display_name or record.borrower_id,
        "gci_score": record.gci_score,
        "manipulation_label": record.manipulation_label,
        "components": {
            "stability": record.stability_score,
            "liquidity": record.liquidity_score,
            "discipline": record.discipline_score,
            "repayment": record.repayment_score,
            "probability_of_default": record.pd_score
        }
    }

@app.get("/temporal/{borrower_id}")
def get_temporal(borrower_id: str, db: Session = Depends(get_db)):
    record = db.query(BorrowerDB).filter(BorrowerDB.borrower_id == borrower_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return json.loads(record.temporal_json)

@app.get("/anomaly/{borrower_id}")
def get_anomaly(borrower_id: str, db: Session = Depends(get_db)):
    record = db.query(BorrowerDB).filter(BorrowerDB.borrower_id == borrower_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return {
        "borrower_id": record.borrower_id,
        "display_name": record.display_name or record.borrower_id,
        "anomaly_score": record.anomaly_score,
        "manipulation_label": record.manipulation_label,
        "flags": json.loads(record.flags_json)
    }

@app.get("/borrower-report/{borrower_id}")
def get_borrower_report(borrower_id: str, db: Session = Depends(get_db)):
    record = db.query(BorrowerDB).filter(BorrowerDB.borrower_id == borrower_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Borrower not found")

    if record.report_json:
        return json.loads(record.report_json)

    temporal = json.loads(record.temporal_json or "{}")
    flags = json.loads(record.flags_json or "{}")
    return {
        "borrower_id": record.borrower_id,
        "display_name": record.display_name or record.borrower_id,
        "profile": {
            "occupation": "Uploaded borrower",
            "city": "Unknown",
            "tier": "N/A",
            "tenure": "N/A",
            "transactions": None,
            "avg_net_monthly_income": None,
            "income_band": "N/A",
            "report_id": f"GCI-{record.borrower_id}",
            "generated_date": "2026-04-20",
            "validity": "30 days",
        },
        "score": {
            "gci": record.gci_score,
            "band": "Very Good" if record.gci_score >= 720 else "Good" if record.gci_score >= 600 else "Poor",
            "pd": record.pd_score,
            "penalty": "1.0x",
            "manipulation": record.manipulation_label,
            "anomaly_score": record.anomaly_score,
        },
        "components": {
            "stability": record.stability_score,
            "liquidity": record.liquidity_score,
            "discipline": record.discipline_score,
            "repayment": record.repayment_score,
        },
        "flags": flags,
        "temporal": temporal,
        "variance": temporal.get("variance", {"festival": 0, "weekly": 0, "residual": 100}),
        "stress": temporal.get("stress_tests", []),
        "shap": [],
        "recommendation": {"type": "review", "title": "Manual Review", "rows": []},
        "events": [],
        "liquidity": [],
        "expenses": [],
        "cvd_note": "Report details are available for seeded demo borrowers.",
    }

@app.get("/borrowers")
def get_borrowers(db: Session = Depends(get_db)):
    records = db.query(BorrowerDB).order_by(BorrowerDB.display_name, BorrowerDB.borrower_id).all()
    return {
        "borrowers": [
            {
                "borrower_id": record.borrower_id,
                "display_name": record.display_name or record.borrower_id,
            }
            for record in records
        ],
        "borrower_ids": [record.borrower_id for record in records],
    }
