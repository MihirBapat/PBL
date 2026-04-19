import pandas as pd
import os

def extract_borrowers():
    print("Extracting individual test borrowers...")
    df = pd.read_csv('data/synthetic/gig_transactions.csv')
    
    # Get the first 3 unique borrowers
    test_borrowers = df['borrower_id'].unique()[:3] 
    
    for b_id in test_borrowers:
        # Filter data for just this borrower
        b_df = df[df['borrower_id'] == b_id]
        output_path = f'data/synthetic/test_{b_id}.csv'
        
        # Save to isolated CSV
        b_df.to_csv(output_path, index=False)
        print(f"✅ Saved {len(b_df)} transactions to {output_path}")

if __name__ == "__main__":
    extract_borrowers()