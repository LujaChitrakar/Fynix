import requests
import pandas as pd
import numpy as np
from ta import add_all_ta_features
from sklearn.preprocessing import StandardScaler
import joblib
import time

# --- Configuration ---
# Need enough historical data to calculate features (e.g., longest SMA window + buffer)
# Let's fetch slightly more than the longest window used in training (SMA_LONG = 15) + some buffer for TA calcs
LOOKBACK_DAYS = 5 # Fetch last 5 days to ensure enough data for indicators like SMA_LONG=15
API_URL = f"https://api.coingecko.com/api/v3/coins/sui/market_chart?vs_currency=usd&days={LOOKBACK_DAYS}"
MODEL_FILENAME = "model.pkl"
SCALER_FILENAME = "scaler.pkl"
FEATURES_FILENAME = "features.pkl" # To ensure we use the same features as training
# Match the parameters used in training_model.py if using manual calculation fallback
SMA_SHORT = 5
SMA_LONG = 15
RSI_PERIOD = 14

# --- Functions (reuse or adapt from train_model.py) ---

def fetch_data(url):
    """Fetches data from the CoinGecko API."""
    print(f"Fetching latest data from {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        print("Data fetched successfully.")
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

def preprocess_data(raw_data):
    """Converts raw API data into a Pandas DataFrame."""
    if not raw_data or 'prices' not in raw_data:
        print("Invalid raw data received.")
        return None

    print("Preprocessing data...")
    prices = raw_data['prices']
    df = pd.DataFrame(prices, columns=['timestamp_ms', 'price'])

    df['timestamp'] = pd.to_datetime(df['timestamp_ms'], unit='ms')
    df = df.set_index('timestamp')
    df = df[['price']]

    # Optional: Add market caps and volumes if needed for features
    if 'market_caps' in raw_data and len(raw_data['market_caps']) > 0:
         mcaps = pd.DataFrame(raw_data['market_caps'], columns=['timestamp_ms', 'market_cap'])
         mcaps['timestamp'] = pd.to_datetime(mcaps['timestamp_ms'], unit='ms')
         mcaps = mcaps.set_index('timestamp')[['market_cap']]
         df = df.join(mcaps, how='left') # Use left join to keep all price points

    if 'total_volumes' in raw_data and len(raw_data['total_volumes']) > 0:
         vols = pd.DataFrame(raw_data['total_volumes'], columns=['timestamp_ms', 'volume'])
         vols['timestamp'] = pd.to_datetime(vols['timestamp_ms'], unit='ms')
         vols = vols.set_index('timestamp')[['volume']]
         df = df.join(vols, how='left')

    # Handle potential duplicate indices
    df = df[~df.index.duplicated(keep='last')] # Keep last in prediction
    df = df.sort_index()

    # Forward fill any missing volume/market cap data if joins didn't align perfectly
    df.ffill(inplace=True)

    print(f"Preprocessing complete. DataFrame shape: {df.shape}")
    return df

def feature_engineering(df, expected_features):
    """Adds technical indicators matching the training features."""
    print("Engineering features for prediction...")
    if df is None or df.empty:
        print("Cannot engineer features on empty DataFrame.")
        return None

    # Ensure we have enough data points for the longest lookback period
    required_data_points = SMA_LONG + 5 # Example: longest SMA + buffer
    if len(df) < required_data_points:
        print(f"Warning: Not enough data points ({len(df)}) to reliably calculate all features requiring up to {required_data_points} periods. Trying anyway.")

    # Create helper columns like in training
    df['Open'] = df['price'].shift(1)
    df['High'] = df[['price', 'Open']].max(axis=1)
    df['Low'] = df[['price', 'Open']].min(axis=1)
    df['Close'] = df['price']
    df['Volume'] = df['volume'] if 'volume' in df.columns else df['price'].diff().abs() * 1000
    df.fillna(method='bfill', inplace=True) # Backfill first row 'Open' NaN if possible

    if df.empty:
         print("DataFrame empty after initial processing.")
         return None

    # Add TA features using the 'ta' library, filling NaNs
    try:
        add_all_ta_features(
            df, open="Open", high="High", low="Low", close="Close", volume="Volume", fillna=True
        )
    except Exception as e:
        print(f"Warning: Error adding TA features: {e}. Trying manual calculation fallback.")
        # Fallback: Calculate basic SMAs and RSI manually if ta fails
        df[f'SMA_{SMA_SHORT}'] = df['Close'].rolling(window=SMA_SHORT).mean()
        df[f'SMA_{SMA_LONG}'] = df['Close'].rolling(window=SMA_LONG).mean()
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=RSI_PERIOD).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=RSI_PERIOD).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        df.fillna(method='bfill', inplace=True) # Backfill NaNs


    # Add simple price change features like in training
    df['price_change_1'] = df['Close'].pct_change(periods=1)
    df['price_change_3'] = df['Close'].pct_change(periods=3)

    # Select only the features used during training
    # Handle potential missing columns gracefully (e.g., if TA lib failed partially)
    available_features = [f for f in expected_features if f in df.columns]
    missing_features = [f for f in expected_features if f not in df.columns]
    if missing_features:
        print(f"Warning: Missing expected features: {missing_features}. They will be ignored or imputed.")
        # Option: Impute missing features (e.g., with 0 or mean), but this can be risky.
        # For simplicity here, we'll just use the available ones, but the model might perform poorly.
        # df[missing_features] = 0 # Example imputation

    # Keep only the columns the model was trained on
    df_features = df[available_features].copy() # Use only available expected features

    # Handle NaNs - crucial for the *last* row prediction
    # Use backfill first, then forward fill for any remaining at the start
    df_features.fillna(method='bfill', inplace=True)
    df_features.fillna(method='ffill', inplace=True)
    # Check if any NaNs remain (shouldn't if fillna worked)
    if df_features.isnull().any().any():
         print("Warning: NaNs still present after fill methods. Filling remaining with 0.")
         df_features.fillna(0, inplace=True)


    print(f"Feature engineering complete. Shape: {df_features.shape}")
    return df_features


# --- Main Execution ---
if __name__ == "__main__":
    # 1. Load Model, Scaler, and Feature List
    try:
        print(f"Loading model from {MODEL_FILENAME}...")
        model = joblib.load(MODEL_FILENAME)
        print(f"Loading scaler from {SCALER_FILENAME}...")
        scaler = joblib.load(SCALER_FILENAME)
        print(f"Loading feature list from {FEATURES_FILENAME}...")
        feature_names = joblib.load(FEATURES_FILENAME)
        print("Model, scaler, and features loaded successfully.")
    except FileNotFoundError as e:
        print(f"Error loading files: {e}")
        print("Please run train_model.py first to generate the necessary files.")
        exit()
    except Exception as e:
        print(f"An unexpected error occurred loading files: {e}")
        exit()

    # 2. Fetch Latest Data
    raw_data = fetch_data(API_URL)
    if raw_data is None:
        exit()

    # 3. Preprocess Data
    df = preprocess_data(raw_data)
    if df is None or df.empty:
        print("Exiting due to preprocessing error.")
        exit()

    # 4. Feature Engineering (using the loaded feature names)
    df_with_features = feature_engineering(df.copy(), feature_names) # Pass expected feature names
    if df_with_features is None or df_with_features.empty:
        print("Exiting due to feature engineering error.")
        exit()

    # 5. Get Latest Features
    latest_features = df_with_features.iloc[-1:] # Get the last row as a DataFrame

    if latest_features.isnull().any().any():
        print("Error: The latest feature row contains NaN values even after filling. Cannot predict.")
        print(latest_features)
        exit()

    # Ensure columns match exactly, including order
    try:
        latest_features = latest_features[feature_names]
    except KeyError as e:
        print(f"Error: Columns in latest data don't match trained features: {e}")
        print(f"Expected: {feature_names}")
        print(f"Found: {latest_features.columns.tolist()}")
        exit()


    # 6. Scale Latest Features
    print("Scaling latest features...")
    try:
        latest_features_scaled = scaler.transform(latest_features)
    except ValueError as e:
        print(f"Error during scaling: {e}")
        print("Make sure the number of features matches the scaler.")
        print(f"Features shape: {latest_features.shape}")
        exit()


    # 7. Predict
    print("Making prediction...")
    prediction_numeric = model.predict(latest_features_scaled)
    probability = model.predict_proba(latest_features_scaled)

    # Map numeric prediction back to labels
    label_map = {1: "Buy", 0: "Hold", -1: "Sell"}
    prediction_label = label_map.get(prediction_numeric[0], "Unknown")

    # 8. Display Result
    print("\n--- Prediction Result ---")
    print(f"Timestamp: {latest_features.index[0]}")
    print(f"Prediction: {prediction_label} ({prediction_numeric[0]})")
    print(f"Probabilities [Sell, Hold, Buy]: {probability[0]}")
    print("-------------------------\n")
    print("**Disclaimer:** This prediction is based on a simplified model and historical data. It is NOT financial advice. Trade responsibly.")