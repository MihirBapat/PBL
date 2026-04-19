import pandas as pd
import numpy as np
from faker import Faker
import uuid
import random
from datetime import datetime, timedelta

fake = Faker('en_IN')

# Configuration
NUM_BORROWERS = 500
MIN_TXNS = 300
MAX_TXNS = 600
FRAUD_RATE = 0.20

def generate_advanced_synthetic_data():
    print(f"Generating advanced dataset for {NUM_BORROWERS} gig workers...")
    transactions = []
    
    categories = ['rent', 'grocery', 'fuel', 'salary', 'tip', 'transfer', 'loan', 'platform_payout', 'subscription']
    payment_modes = ['UPI', 'NEFT', 'IMPS', 'cash_deposit', 'platform_payout']
    counterparty_types = ['employer', 'merchant', 'peer', 'unknown', 'platform']
    
    # Determine fraud profiles
    num_fraud = int(NUM_BORROWERS * FRAUD_RATE)
    fraud_types = ['income_spiking', 'expense_suppression', 'round_trip', 'synthetic_regularity', 'dormant_activation']
    fraud_assignments = [fraud_types[i % 5] for i in range(num_fraud)] + ['clean'] * (NUM_BORROWERS - num_fraud)
    random.shuffle(fraud_assignments)
    
    for i in range(NUM_BORROWERS):
        borrower_id = str(uuid.uuid4())
        num_txns = random.randint(MIN_TXNS, MAX_TXNS)
        profile_type = fraud_assignments[i]
        
        start_date = datetime.now() - timedelta(days=365)
        current_balance = round(random.uniform(2000, 10000), 2)
        
        # Profile specific variables
        base_income = random.uniform(8000, 45000)
        round_trip_counterparty = fake.sha256()[:16]
        
        for txn_idx in range(num_txns):
            # Base time increment
            if profile_type == 'dormant_activation' and txn_idx < int(num_txns * 0.8):
                # Dormant phase: very few transactions, spread out over 9 months
                current_date = start_date + timedelta(days=random.randint(1, 270))
            elif profile_type == 'dormant_activation':
                # Activation phase: heavy usage in last 3 months
                current_date = start_date + timedelta(days=270) + timedelta(hours=random.randint(2, 720))
            elif profile_type == 'synthetic_regularity' and txn_idx > int(num_txns * 0.7):
                # Perfect weekly cadence for the last 90 days
                current_date = start_date + timedelta(days=275 + (txn_idx % 12) * 7)
            else:
                # Normal distribution of time
                current_date = start_date + timedelta(days=(txn_idx / num_txns) * 365)
            
            month = current_date.month
            direction = random.choice(['credit', 'debit', 'debit', 'debit']) # More debits than credits generally
            category = random.choice(categories)
            counterparty = fake.sha256()[:16]
            festival_window = None
            
            # 1. Apply Seasonality Rules
            seasonality_multiplier = 1.0
            if month == 10: # Diwali
                seasonality_multiplier = 1.40
                festival_window = 'diwali'
            elif month == 4: # IPL
                seasonality_multiplier = 1.25
                festival_window = 'ipl'
            elif month == 7: # Monsoon
                seasonality_multiplier = 0.80
                festival_window = 'monsoon'
            
            amount = round(random.uniform(50, base_income * 0.1) * seasonality_multiplier, 2)
            
            # 2. Apply Manipulation Patterns
            if profile_type == 'income_spiking' and direction == 'credit' and (datetime.now() - current_date).days <= 90:
                amount *= random.uniform(2.5, 3.5) # 3x spike in last 90 days
                
            if profile_type == 'expense_suppression' and direction == 'debit' and category in ['rent', 'subscription', 'fuel'] and (datetime.now() - current_date).days <= 90:
                continue # Skip generating this recurring expense in the assessment window
                
            if profile_type == 'synthetic_regularity' and direction == 'credit' and (datetime.now() - current_date).days <= 90:
                amount = 5000.00 # Statistically perfect round numbers
                
            if profile_type == 'round_trip' and txn_idx % 15 == 0: # Inject round trip every ~15th txn
                amount = 10000.00
                direction = 'credit'
                counterparty = round_trip_counterparty
                # Immediately append the out-leg of the round trip
                transactions.append({
                    'transaction_id': str(uuid.uuid4()), 'borrower_id': borrower_id,
                    'timestamp': (current_date + timedelta(hours=random.randint(12, 48))).strftime('%Y-%m-%d %H:%M:%S'),
                    'amount': amount, 'direction': 'debit', 'counterparty_id': counterparty,
                    'counterparty_type': 'peer', 'payment_mode': 'UPI', 'category': 'transfer',
                    'description': 'Reversal/Transfer', 'balance_after_txn': current_balance,
                    'festival_window': festival_window
                })
            
            # Process Balance
            if direction == 'credit':
                current_balance += amount
            else:
                current_balance = max(0, current_balance - amount)
                
            transactions.append({
                'transaction_id': str(uuid.uuid4()),
                'borrower_id': borrower_id,
                'timestamp': current_date.strftime('%Y-%m-%d %H:%M:%S'),
                'amount': amount,
                'direction': direction,
                'counterparty_id': counterparty,
                'counterparty_type': random.choice(counterparty_types),
                'payment_mode': random.choice(payment_modes),
                'category': category,
                'description': fake.sentence(nb_words=3),
                'balance_after_txn': round(current_balance, 2),
                'festival_window': festival_window
            })

    # Convert to DataFrame and sort chronologically per borrower
    df = pd.DataFrame(transactions)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(by=['borrower_id', 'timestamp'])
    
    output_path = 'data/synthetic/gig_transactions.csv'
    df.to_csv(output_path, index=False)
    print(f"Successfully generated {len(df)} transactions and saved to {output_path}")
    print(f"Injected manipulation patterns into {FRAUD_RATE*100}% of profiles for testing.")

if __name__ == "__main__":
    generate_advanced_synthetic_data()