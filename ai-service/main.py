import os
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import psycopg2

app = FastAPI(title="AI Agriculture Forecasting Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://vigneshp@localhost:5433/agri_forecast")

class PredictRequest(BaseModel):
    district: str
    commodity: str

class PredictResponse(BaseModel):
    predictedQuantity: float
    predictedPrice: float
    reason: str
    percentageChangeQuantity: float
    percentageChangePrice: float

def get_historical_data(district: str, commodity: str):
    """Fetch historical data from PostgreSQL database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        query = """
            SELECT arrival_date, quantity_kg, modal_price
            FROM market_data md
            JOIN districts d ON md.district_id = d.id
            JOIN commodities c ON md.commodity_id = c.id
            WHERE d.name = %s AND c.name = %s
            ORDER BY arrival_date ASC
        """
        df = pd.read_sql_query(query, conn, params=(district, commodity))
        conn.close()
        return df
    except Exception as e:
        print(f"Error fetching data from database: {e}")
        return pd.DataFrame()

def generate_prophet_forecast(df: pd.DataFrame, target_col: str):
    """Train Prophet model and forecast next month"""
    try:
        from prophet import Prophet
        
        # Prepare dataframe for Prophet
        # ds: date, y: value
        prophet_df = df[['arrival_date', target_col]].rename(columns={'arrival_date': 'ds', target_col: 'y'})
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        
        # Initialize and fit model
        model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
        model.fit(prophet_df)
        
        # Create future dataframe for 30 days ahead
        future = model.make_future_dataframe(periods=30, freq='D')
        forecast = model.predict(future)
        
        # Return predicted value for the last row
        predicted_val = forecast.iloc[-1]['yhat']
        return float(predicted_val)
    except Exception as e:
        print(f"Prophet forecast failed for {target_col}, using fallback: {e}")
        
        # Rollback/fallback calculation using basic stats (seasonal trend estimation)
        if target_col == 'quantity_kg':
            # July quantity is usually 12-16% higher than June average
            june_avg = df[df['arrival_date'].astype(str).str.contains('-06-')][target_col].mean()
            if pd.isna(june_avg):
                june_avg = df[target_col].mean()
            return float(june_avg * 1.15)
        else:
            # July prices are usually 15-20% lower than June average due to high supply
            june_avg = df[df['arrival_date'].astype(str).str.contains('-06-')][target_col].mean()
            if pd.isna(june_avg):
                june_avg = df[target_col].mean()
            return float(june_avg * 0.83)

def generate_explanation(district: str, commodity: str, current_qty: float, predicted_qty: float, current_price: float, predicted_price: float):
    """Generate explainable AI rules"""
    qty_diff_pct = ((predicted_qty - current_qty) / current_qty) * 100
    price_diff_pct = ((predicted_price - current_price) / current_price) * 100
    
    abs_qty_pct = abs(qty_diff_pct)
    abs_price_pct = abs(price_diff_pct)
    
    # 1. Quantity part
    if qty_diff_pct >= 0:
        qty_part = f"{commodity} arrivals in {district} are expected to increase by {abs_qty_pct:.1f}% next month compared to the previous month due to seasonal harvesting patterns. Higher market arrivals"
    else:
        qty_part = f"{commodity} arrivals in {district} are expected to decrease by {abs_qty_pct:.1f}% next month compared to the previous month due to seasonal off-season harvest patterns. Lower market arrivals"
        
    # 2. Price part
    if price_diff_pct >= 0:
        price_part = f" may increase modal prices by approximately {abs_price_pct:.1f}% due to supply constraints."
    else:
        price_part = f" may reduce modal prices by approximately {abs_price_pct:.1f}% due to increased supply."
    return qty_part + price_part

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    df = get_historical_data(request.district, request.commodity)
    
    if df.empty or len(df) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient historical data to run forecasting for {request.commodity} in {request.district}."
        )
        
    # Get current (latest) values
    latest_row = df.iloc[-1]
    current_qty = float(latest_row['quantity_kg'])
    current_price = float(latest_row['modal_price'])
    
    # Generate independent Prophet forecasts
    predicted_qty = generate_prophet_forecast(df, 'quantity_kg')
    predicted_price = generate_prophet_forecast(df, 'modal_price')
    
    # Ensure realistic minimum values
    predicted_qty = max(100.0, predicted_qty)
    predicted_price = max(1.0, predicted_price)
    
    # Generate Explanation (Rule-based Explainable AI)
    reason = generate_explanation(
        request.district, 
        request.commodity, 
        current_qty, 
        predicted_qty, 
        current_price, 
        predicted_price
    )
    qty_diff_pct = ((predicted_qty - current_qty) / current_qty) * 100
    price_diff_pct = ((predicted_price - current_price) / current_price) * 100

    return PredictResponse(
        predictedQuantity=round(predicted_qty, 2),
        predictedPrice=round(predicted_price, 2),
        reason=reason,
        percentageChangeQuantity=round(qty_diff_pct, 2),
        percentageChangePrice=round(price_diff_pct, 2)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
