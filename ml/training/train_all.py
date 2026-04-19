import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import IsolationForest
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# Ensure models directory exists
os.makedirs('models', exist_ok=True)

# ---------------------------------------------------------
# M1 & M3 Wrapper Classes (To allow saving as .pkl files)
# ---------------------------------------------------------
class TemporalDecomposer:
    """M1: Wrapper for STL logic to maintain pipeline architecture"""
    def __init__(self):
        self.name = "STL_Decomposer_v1"
    def transform(self, df):
        return df # Computation already handled in feature engineering MVP

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
            if row['expense_income_ratio'] < 0.2: flag += 1 # Expense suppression
            flags.append(1 if flag > 0 else 0)
        return np.array(flags)

def train_pipeline():
    print("Loading feature matrix...")
    df = pd.read_csv('data/processed/features.csv')
    borrower_ids = df['borrower_id']
    X = df.drop(columns=['borrower_id'])

    # ---------------------------------------------------------
    # M1: Temporal Decomposer (Mock save for architecture compliance)
    # ---------------------------------------------------------
    m1_stl = TemporalDecomposer()
    joblib.dump(m1_stl, 'models/m1_temporal_decomposer.pkl')
    print("[1/4] M1 Temporal Decomposer saved.")

    # ---------------------------------------------------------
    # M2: Isolation Forest (Anomaly Detection)
    # ---------------------------------------------------------
    m2_iforest = IsolationForest(contamination=0.20, random_state=42)
    m2_iforest.fit(X)
    joblib.dump(m2_iforest, 'models/m2_isolation_forest.pkl')
    print("[2/4] M2 Isolation Forest trained and saved.")

    # ---------------------------------------------------------
    # M3: Hard Rule Engine
    # ---------------------------------------------------------
    m3_rules = FraudRuleEngine()
    joblib.dump(m3_rules, 'models/m3_fraud_rules.pkl')
    print("[3/4] M3 Fraud Rule Engine saved.")

    # ---------------------------------------------------------
    # M4: XGBoost Probability of Default (PD) Classifier
    # ---------------------------------------------------------
    # Generate synthetic target labels for MVP training purposes
    # High expense ratio, low liquidity, and high anomaly score = higher risk of default
   # ---------------------------------------------------------
    # M4: XGBoost Probability of Default (PD) Classifier
    # ---------------------------------------------------------
    anomaly_scores = m2_iforest.predict(X) # -1 is anomaly, 1 is normal
    
    # Calculate a composite risk score for synthetic labeling
    # High expense ratio + low liquidity + anomaly presence = high risk
    risk_score = X['expense_income_ratio'] + (5 / (X['liquidity_buffer_weeks'] + 0.1))
    risk_score += np.where(anomaly_scores == -1, 10, 0)
    
    # Guarantee exactly a 25% default rate for MVP training stability
    default_threshold = np.percentile(risk_score, 75)
    y = np.where(risk_score > default_threshold, 1, 0)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    m4_xgb = XGBClassifier(eval_metric='logloss', random_state=42)
    m4_xgb.fit(X_train, y_train)
    
    preds = m4_xgb.predict(X_test)
    acc = accuracy_score(y_test, preds)
    
    joblib.dump(m4_xgb, 'models/m4_xgboost_pd.pkl')
    print(f"[4/4] M4 XGBoost Classifier trained (Accuracy: {acc:.2f}) and saved.")
    print("\n✅ SUCCESS: All four models saved to /models/ directory.")

if __name__ == "__main__":
    train_pipeline()