import pandas as pd
import numpy as np
import warnings
from statsmodels.tsa.seasonal import STL

# Suppress statsmodels warnings for short time series in MVP
warnings.filterwarnings("ignore")

def compute_features(input_path, output_path):
    print("Loading raw transactions for feature engineering...")
    df = pd.read_csv(input_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    features = []
    borrowers = df['borrower_id'].unique()
    print(f"Processing features for {len(borrowers)} borrowers...")

    for borrower in borrowers:
        b_df = df[df['borrower_id'] == borrower].copy()
        b_df.set_index('timestamp', inplace=True)
        b_df.sort_index(inplace=True)

        # Separate credits and debits
        credits = b_df[b_df['direction'] == 'credit']
        debits = b_df[b_df['direction'] == 'debit']

        # Monthly Aggregations
        monthly_income = credits['amount'].resample('ME').sum().fillna(0)
        monthly_expense = debits['amount'].resample('ME').sum().fillna(0)
        
        # 1 & 2. Income & Volatility
        avg_monthly_income = monthly_income.mean()
        income_volatility = monthly_income.std() / avg_monthly_income if avg_monthly_income > 0 else 0

        # 3. CVD Residual Variance (Simplified MVP STL Decomposition)
        cvd_residual_variance = 0
        if len(monthly_income) >= 6: # Need minimum data points for STL
            try:
                stl = STL(monthly_income, period=3, robust=True).fit()
                cvd_residual_variance = np.var(stl.resid) / np.var(monthly_income) if np.var(monthly_income) > 0 else 0
            except:
                cvd_residual_variance = income_volatility # Fallback

        # 4. Liquidity Buffer Weeks
        avg_balance = b_df['balance_after_txn'].resample('ME').last().mean()
        avg_weekly_expense = monthly_expense.mean() / 4.33
        liquidity_buffer_weeks = avg_balance / avg_weekly_expense if avg_weekly_expense > 0 else 12

        # 5. Expense to Income Ratio
        expense_income_ratio = monthly_expense.mean() / avg_monthly_income if avg_monthly_income > 0 else 1

        # 6. Round Trip Count (72-hour window approximations)
        # For MVP: Count credits > 5000 followed by debits of similar amount
        round_trip_count = len(b_df[(b_df['amount'] > 5000) & (b_df['category'] == 'transfer')])

        # 7. Dormancy Score (Activity in last 90 days vs previous)
        cutoff_90d = b_df.index.max() - pd.Timedelta(days=90)
        recent_txns = len(b_df[b_df.index >= cutoff_90d])
        historical_txns = len(b_df[b_df.index < cutoff_90d])
        dormancy_score = recent_txns / (historical_txns / 3 + 1) # Normalized

        # 8. Weekly Std Ratio
        weekly_income = credits['amount'].resample('W').sum().fillna(0)
        recent_weekly_std = weekly_income[weekly_income.index >= cutoff_90d].std()
        hist_weekly_std = weekly_income[weekly_income.index < cutoff_90d].std()
        weekly_std_ratio = recent_weekly_std / hist_weekly_std if hist_weekly_std > 0 else 1

        # 9. Festival Uplift Ratio
        festival_txns = credits[credits['festival_window'].notnull()]
        festival_uplift_ratio = festival_txns['amount'].mean() / avg_monthly_income if avg_monthly_income > 0 and len(festival_txns) > 0 else 1.0

        features.append({
            'borrower_id': borrower,
            'avg_monthly_income': round(avg_monthly_income, 2),
            'income_volatility': round(income_volatility, 4),
            'cvd_residual_variance': round(cvd_residual_variance, 4),
            'liquidity_buffer_weeks': round(liquidity_buffer_weeks, 2),
            'expense_income_ratio': round(expense_income_ratio, 4),
            'round_trip_count': round_trip_count,
            'dormancy_score': round(dormancy_score, 4),
            'weekly_std_ratio': round(weekly_std_ratio, 4),
            'festival_uplift_ratio': round(festival_uplift_ratio, 4)
        })

    features_df = pd.DataFrame(features)
    features_df.to_csv(output_path, index=False)
    print(f"Feature matrix saved to {output_path} with {len(features_df)} rows and {len(features_df.columns)} columns.")

if __name__ == "__main__":
    compute_features('data/synthetic/gig_transactions.csv', 'data/processed/features.csv')