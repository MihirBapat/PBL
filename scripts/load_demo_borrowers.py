import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "gci_mvp.db"


def ensure_columns(conn):
    columns = conn.execute("PRAGMA table_info(borrowers)").fetchall()
    names = {column[1] for column in columns}
    if "display_name" not in names:
        conn.execute("ALTER TABLE borrowers ADD COLUMN display_name VARCHAR")
    if "report_json" not in names:
        conn.execute("ALTER TABLE borrowers ADD COLUMN report_json TEXT")


def score_color(score):
    if score >= 720:
        return "green"
    if score >= 600:
        return "amber"
    return "red"


def score_band(score):
    if score >= 720:
        return "Very Good"
    if score >= 600:
        return "Good"
    return "Poor"


def build_record(
    borrower_id,
    display_name,
    profile,
    gci,
    pd_score,
    stability,
    liquidity,
    discipline,
    repayment,
    manipulation,
    penalty,
    anomaly_score,
    flag_rows,
    income,
    seasonal,
    residual,
    trend,
    variance,
    stress,
    shap,
    recommendation,
    events,
    cvd_note,
    cohort_pct,
    trend_slope,
    trend_dir,
):
    temporal = {
        "raw": income,
        "seasonal": seasonal,
        "residual": residual,
        "trend": trend,
        "variance": variance,
        "stress_tests": stress,
    }
    flags = {
        "triggered_rules": sum(1 for flag in flag_rows if not flag["ok"]),
        "is_anomaly_forest": anomaly_score >= 0.65,
        "items": flag_rows,
        "checks": {flag["code"]: not flag["ok"] for flag in flag_rows},
    }
    report = {
        "borrower_id": borrower_id,
        "display_name": display_name,
        "profile": profile,
        "score": {
            "gci": gci,
            "color": score_color(gci),
            "band": score_band(gci),
            "pd": pd_score,
            "penalty": penalty,
            "manipulation": manipulation,
            "anomaly_score": anomaly_score,
            "cohort_percentile": cohort_pct,
        },
        "components": {
            "stability": stability,
            "liquidity": liquidity,
            "discipline": discipline,
            "repayment": repayment,
        },
        "flags": flags,
        "temporal": temporal,
        "variance": variance,
        "stress": stress,
        "shap": shap,
        "recommendation": recommendation,
        "events": events,
        "trend": {"slope": trend_slope, "direction": trend_dir},
        "cvd_note": cvd_note,
        "liquidity": [
            {"month": f"M{i + 1}", "balance": round(value * 0.18 + 2400 + (i % 3) * 260), "floor": round(value * 0.30)}
            for i, value in enumerate(income)
        ],
        "expenses": [
            {
                "month": f"M{i + 1}",
                "recurring": 0 if manipulation == "High Risk" and i >= max(5, len(income) - 3) else round(value * 0.34),
                "variable": round(value * 0.27 + (i % 4) * 240),
            }
            for i, value in enumerate(income)
        ],
        "timeline": [
            {"month": f"M{i + 1}", "income": value, "flagged": manipulation != "Clean" and i >= int(len(income) * 0.6)}
            for i, value in enumerate(income)
        ],
    }
    return {
        "borrower_id": borrower_id,
        "display_name": display_name,
        "gci_score": gci,
        "pd_score": pd_score / 100,
        "stability_score": stability,
        "liquidity_score": liquidity,
        "discipline_score": discipline,
        "repayment_score": repayment,
        "manipulation_label": manipulation,
        "anomaly_score": anomaly_score,
        "flags_json": json.dumps(flags),
        "temporal_json": json.dumps(temporal),
        "report_json": json.dumps(report),
    }


DEMO_BORROWERS = [
    build_record(
        "raju_patil",
        "Raju Patil",
        {
            "occupation": "Swiggy Delivery Rider",
            "city": "Pune, Maharashtra",
            "tier": "Tier 2",
            "tenure": "4 yrs 2 mo",
            "transactions": 1847,
            "avg_net_monthly_income": "Rs 22,400",
            "income_band": "Rs 12k-25k",
            "report_id": "GCI-2026-04-7731",
            "generated_date": "15 Apr 2026",
            "validity": "30 days",
        },
        762,
        7.2,
        81,
        74,
        78,
        83,
        "Clean",
        "1.0x",
        0.18,
        [
            {"code": "F1", "name": "Income spiking check", "ok": True, "reason": "No pre-application inflation detected"},
            {"code": "F2", "name": "Expense suppression check", "ok": True, "reason": "Recurring signatures stable in assessment window"},
            {"code": "F3", "name": "Round-trip transaction scan", "ok": True, "reason": "Zero circular UPI pairs in 72-hour windows"},
            {"code": "F4", "name": "Synthetic regularity check", "ok": True, "reason": "Income pattern matches historical variance profile"},
            {"code": "F5", "name": "Dormant account activation", "ok": True, "reason": "Consistent activity across full tenure"},
        ],
        [19000, 20000, 20000, 28000, 21000, 22000, 17000, 18000, 22000, 31000, 23000, 20000],
        [1000, 500, 1000, 6000, 500, 500, -4000, -3000, 1000, 9000, 2000, 500],
        [300, -200, 400, 600, -300, 100, -200, 300, -100, 500, -300, 200],
        [18800, 19100, 19400, 19700, 20000, 20300, 20600, 20900, 21200, 21500, 21800, 22100],
        {"festival": 38, "weekly": 22, "residual": 15, "explained": 85},
        [
            {"scenario": "Normal", "repayment_probability": 93},
            {"scenario": "25% income drop", "repayment_probability": 78},
            {"scenario": "40% income drop", "repayment_probability": 64},
        ],
        [
            {"label": "Liquidity Cover Ratio", "value": 88, "positive": True},
            {"label": "Expense Discipline Score", "value": 74, "positive": True},
            {"label": "Tenure length (4+ yrs)", "value": 67, "positive": True},
            {"label": "CVD-adjusted stability", "value": 61, "positive": True},
            {"label": "Raw income volatility", "value": 33, "positive": False},
        ],
        {
            "type": "approve",
            "title": "Recommendation - Approve",
            "rows": [
                ["Decision", "Approve - GCI 762 (Very Good)"],
                ["Suggested loan amount", "Rs 50,000"],
                ["Monthly EMI", "Rs 1,800"],
                ["Recommended tenure", "36 months"],
                ["Indicative interest rate", "14.0% p.a."],
                ["Review trigger", "Flag if 2 consecutive EMIs missed"],
            ],
        },
        [
            {"name": "Diwali (Oct)", "status": "active", "pct": "+41%", "note": "Within cohort ceiling"},
            {"name": "IPL season (Apr)", "status": "active", "pct": "+33%", "note": "Cricket-driven demand"},
            {"name": "Monsoon dip (Jul)", "status": "active", "pct": "-23%", "note": "Weather-explained"},
        ],
        "85% of measured income volatility is attributable to calendar events. Residual risk of 15% is below the 30% cutoff.",
        72,
        "+Rs 280/mo",
        "Upward",
    ),
    build_record(
        "vikram_s",
        "Vikram S.",
        {
            "occupation": "Freelancer / Self-employed",
            "city": "Hyderabad, Telangana",
            "tier": "Tier 1",
            "tenure": "8 months",
            "transactions": 312,
            "avg_net_monthly_income": "Rs 28,600",
            "income_band": "Rs 25k-40k",
            "report_id": "GCI-2026-04-8821",
            "generated_date": "15 Apr 2026",
            "validity": "30 days",
        },
        431,
        41.3,
        29,
        38,
        22,
        31,
        "High Risk",
        "0.50x",
        0.87,
        [
            {"code": "F1", "name": "Income spiking check", "ok": False, "reason": "Last 90 days income is 3.1x cohort 99th percentile"},
            {"code": "F2", "name": "Expense suppression check", "ok": False, "reason": "Rent, telecom, and grocery signatures absent"},
            {"code": "F3", "name": "Round-trip transaction scan", "ok": False, "reason": "4 circular pairs within 72 hours totaling Rs 60,000"},
            {"code": "F4", "name": "Synthetic regularity check", "ok": True, "reason": "No synthetic regularity pattern detected"},
            {"code": "F5", "name": "Dormant account activation", "ok": False, "reason": "Transaction frequency 11.75x above baseline"},
        ],
        [14000, 13000, 15000, 14000, 13000, 42000, 44000, 38000],
        [500, 300, 400, 300, 400, 800, 900, 700],
        [200, 400, 300, 500, 300, 28000, 29000, 24000],
        [13800, 14000, 14200, 14400, 14600, 14800, 15000, 15200],
        {"festival": 8, "weekly": 4, "residual": 88, "explained": 12},
        [
            {"scenario": "Normal", "repayment_probability": 41},
            {"scenario": "25% income drop", "repayment_probability": 18},
            {"scenario": "40% income drop", "repayment_probability": 8},
        ],
        [
            {"label": "Round-trip transaction count", "value": 91, "positive": False},
            {"label": "Dormancy activation score", "value": 88, "positive": False},
            {"label": "Income spike ratio", "value": 85, "positive": False},
            {"label": "Expense suppression delta", "value": 79, "positive": False},
            {"label": "Liquidity cover ratio", "value": 28, "positive": True},
        ],
        {
            "type": "reject",
            "title": "Recommendation - Reject",
            "rows": [
                ["Decision", "Reject - High Risk manipulation label"],
                ["Primary reason", "4 of 5 hard fraud rules triggered"],
                ["Penalty applied", "0.50x multiplier on raw score"],
                ["Compliance action", "Refer to compliance review board"],
                ["Re-application", "Eligible after 6-month clean data window"],
            ],
        },
        [
            {"name": "No festival correlation", "status": "risk", "pct": "N/A", "note": "Spikes have no calendar cause"},
            {"name": "Income spike (Jun-Aug)", "status": "risk", "pct": "+210%", "note": "3.1x cohort 99th percentile"},
            {"name": "Dormant activation", "status": "risk", "pct": "11.75x", "note": "Frequency vs baseline"},
        ],
        "Only 12% of volatility is calendar-explainable. Residual risk of 88% exceeds the 30% risk threshold.",
        11,
        "Insufficient data",
        "Unknown",
    ),
    build_record(
        "meena_devi",
        "Meena Devi",
        {
            "occupation": "Tailor / Garment Worker",
            "city": "Jaipur, Rajasthan",
            "tier": "Tier 3",
            "tenure": "2 yrs 9 mo",
            "transactions": 980,
            "avg_net_monthly_income": "Rs 14,200",
            "income_band": "Rs 12k-25k",
            "report_id": "GCI-2026-04-6612",
            "generated_date": "15 Apr 2026",
            "validity": "30 days",
        },
        638,
        18.4,
        62,
        54,
        67,
        59,
        "Suspicious",
        "0.75x",
        0.71,
        [
            {"code": "F1", "name": "Income spiking check", "ok": False, "reason": "Navratri window income 1.8x cohort ceiling"},
            {"code": "F2", "name": "Expense suppression check", "ok": True, "reason": "Recurring expense signatures present"},
            {"code": "F3", "name": "Round-trip transaction scan", "ok": True, "reason": "No circular pairs detected"},
            {"code": "F4", "name": "Synthetic regularity check", "ok": True, "reason": "Income pattern matches garment seasonality"},
            {"code": "F5", "name": "Dormant account activation", "ok": True, "reason": "Consistent activity throughout tenure"},
        ],
        [12000, 11000, 13000, 12000, 14000, 13000, 11000, 12000, 18000, 16000, 15000, 13000],
        [0, 0, 500, 500, 1000, 500, -500, 0, 5000, 3000, 2000, 500],
        [400, -300, 500, -200, 600, 300, -400, 500, 1800, 700, -300, 400],
        [12600, 12700, 12800, 12900, 13000, 13100, 13200, 13300, 13400, 13500, 13600, 13700],
        {"festival": 42, "weekly": 19, "residual": 39, "explained": 61},
        [
            {"scenario": "Normal", "repayment_probability": 72},
            {"scenario": "25% income drop", "repayment_probability": 54},
            {"scenario": "40% income drop", "repayment_probability": 38},
        ],
        [
            {"label": "CVD-adjusted stability", "value": 62, "positive": True},
            {"label": "Tenure length (2.7 yrs)", "value": 55, "positive": True},
            {"label": "Expense discipline score", "value": 42, "positive": True},
            {"label": "Navratri income excess", "value": 58, "positive": False},
            {"label": "Low liquidity cover ratio", "value": 44, "positive": False},
        ],
        {
            "type": "conditional",
            "title": "Conditional Approval - Reduced Amount",
            "rows": [
                ["Decision", "Conditional approve - Suspicious flag"],
                ["Suggested loan amount", "Rs 25,000"],
                ["Monthly EMI", "Rs 1,100"],
                ["Recommended tenure", "30 months"],
                ["Indicative interest rate", "16.0% p.a."],
                ["Condition", "2-month monitoring window before disbursal"],
            ],
        },
        [
            {"name": "Navratri (Sep)", "status": "risk", "pct": "+50%", "note": "1.8x cohort ceiling"},
            {"name": "Wedding season (Oct-Nov)", "status": "active", "pct": "+23%", "note": "Garment industry seasonal"},
            {"name": "Off-season (Jul-Aug)", "status": "inactive", "pct": "-18%", "note": "Normal garment off-season"},
        ],
        "61% of volatility is calendar-explainable, but the Navratri spike exceeds the cohort ceiling and triggers Suspicious review.",
        48,
        "+Rs 120/mo",
        "Slight upward",
    ),
]


def main():
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_columns(conn)
        ids = [record["borrower_id"] for record in DEMO_BORROWERS]
        conn.execute(f"DELETE FROM borrowers WHERE borrower_id NOT IN ({','.join('?' for _ in ids)})", ids)
        for record in DEMO_BORROWERS:
            conn.execute(
                """
                INSERT INTO borrowers (
                    borrower_id, display_name, gci_score, pd_score, stability_score,
                    liquidity_score, discipline_score, repayment_score, manipulation_label,
                    anomaly_score, flags_json, temporal_json, report_json
                )
                VALUES (
                    :borrower_id, :display_name, :gci_score, :pd_score, :stability_score,
                    :liquidity_score, :discipline_score, :repayment_score, :manipulation_label,
                    :anomaly_score, :flags_json, :temporal_json, :report_json
                )
                ON CONFLICT(borrower_id) DO UPDATE SET
                    display_name = excluded.display_name,
                    gci_score = excluded.gci_score,
                    pd_score = excluded.pd_score,
                    stability_score = excluded.stability_score,
                    liquidity_score = excluded.liquidity_score,
                    discipline_score = excluded.discipline_score,
                    repayment_score = excluded.repayment_score,
                    manipulation_label = excluded.manipulation_label,
                    anomaly_score = excluded.anomaly_score,
                    flags_json = excluded.flags_json,
                    temporal_json = excluded.temporal_json,
                    report_json = excluded.report_json
                """,
                record,
            )
        conn.commit()

        rows = conn.execute(
            "SELECT borrower_id, display_name, gci_score, anomaly_score, manipulation_label FROM borrowers ORDER BY display_name"
        ).fetchall()
        for row in rows:
            print(row)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
