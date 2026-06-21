-- AI Agriculture Forecasting Platform - Upgraded Database Schema
-- Supports Multi-District and Multi-Commodity dynamically

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean state and avoid schema conflicts
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS market_data CASCADE;
DROP TABLE IF EXISTS commodities CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- Districts Table
-- =====================================================
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- =====================================================
-- Commodities Table
-- =====================================================
CREATE TABLE commodities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- =====================================================
-- Market Data Table
-- =====================================================
CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    commodity_id INTEGER NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    market_name VARCHAR(200),
    arrival_date DATE NOT NULL,
    quantity_kg NUMERIC(12, 2),
    min_price NUMERIC(10, 2),
    max_price NUMERIC(10, 2),
    modal_price NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_market_data_composite UNIQUE (district_id, commodity_id, arrival_date)
);

CREATE INDEX idx_market_data_district ON market_data(district_id);
CREATE INDEX idx_market_data_commodity ON market_data(commodity_id);
CREATE INDEX idx_market_data_date ON market_data(arrival_date);

-- =====================================================
-- Predictions Table
-- =====================================================
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    commodity_id INTEGER NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    predicted_quantity NUMERIC(12, 2),
    predicted_price NUMERIC(10, 2),
    reason TEXT,
    model_version VARCHAR(50) DEFAULT 'v2.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_predictions_district ON predictions(district_id);
CREATE INDEX idx_predictions_commodity ON predictions(commodity_id);
CREATE INDEX idx_predictions_date ON predictions(prediction_date);

-- =====================================================
-- Dynamic Seed Data Generation (for 12+ months)
-- =====================================================

-- Insert upgraded districts
INSERT INTO districts (name) VALUES 
('Dharmapuri'),
('Salem'),
('Coimbatore'),
('Krishnagiri'),
('Vellore');

-- Insert upgraded commodities
INSERT INTO commodities (name) VALUES 
('Tomato'),
('Onion'),
('Brinjal'),
('Potato'),
('Cabbage'),
('Carrot'),
('Beans'),
('Chilli'),
('Ladies Finger');

-- Dynamic Generator Block: Adds realistic weekly market data from June 2025 to June 2026
-- for all combinations of the 5 districts and 9 commodities.
DO $$
DECLARE
    dist_rec RECORD;
    comm_rec RECORD;
    curr_date DATE;
    base_qty NUMERIC;
    base_price NUMERIC;
    qty_val NUMERIC;
    price_val NUMERIC;
    min_p NUMERIC;
    max_p NUMERIC;
    month_val INTEGER;
    seasonal_factor NUMERIC;
    dist_factor NUMERIC;
    comm_factor NUMERIC;
BEGIN
    FOR dist_rec IN SELECT id, name FROM districts LOOP
        -- Define district factor (e.g. Coimbatore and Salem are larger hubs)
        IF dist_rec.name = 'Coimbatore' THEN dist_factor := 1.5;
        ELSIF dist_rec.name = 'Salem' THEN dist_factor := 1.25;
        ELSIF dist_rec.name = 'Vellore' THEN dist_factor := 1.1;
        ELSE dist_factor := 0.9;
        END IF;

        FOR comm_rec IN SELECT id, name FROM commodities LOOP
            -- Define base quantity and base price per commodity
            CASE comm_rec.name
                WHEN 'Tomato' THEN base_qty := 20000; base_price := 16;
                WHEN 'Onion' THEN base_qty := 35000; base_price := 25;
                WHEN 'Brinjal' THEN base_qty := 12000; base_price := 18;
                WHEN 'Potato' THEN base_qty := 45000; base_price := 22;
                WHEN 'Cabbage' THEN base_qty := 15000; base_price := 12;
                WHEN 'Carrot' THEN base_qty := 18000; base_price := 28;
                WHEN 'Beans' THEN base_qty := 8000; base_price := 35;
                WHEN 'Chilli' THEN base_qty := 6000; base_price := 45;
                WHEN 'Ladies Finger' THEN base_qty := 14000; base_price := 15;
            END CASE;

            -- Iterate week by week (every 7 days) from 2025-06-01 to 2026-06-14
            curr_date := '2025-06-01'::DATE;
            WHILE curr_date <= '2026-06-14'::DATE LOOP
                month_val := EXTRACT(MONTH FROM curr_date);

                -- Seasonal arrivals & price fluctuations
                -- Winter (Nov, Dec, Jan) has high price/low qty for most crops
                -- Summer/Harvest (Jul, Aug, Feb, Mar) has low price/high qty
                IF month_val IN (11, 12, 1) THEN
                    seasonal_factor := 0.75; -- Lower quantity
                ELSIF month_val IN (7, 8, 2, 3) THEN
                    seasonal_factor := 1.3;  -- Peak harvest quantity
                ELSE
                    seasonal_factor := 1.0;
                END IF;

                -- Quantity (inverse relationship with price)
                qty_val := ROUND((base_qty * dist_factor * seasonal_factor * (0.9 + random() * 0.2))::numeric, 2);
                
                -- Price is inversely proportional to quantity
                price_val := ROUND((base_price * (1.0 / (seasonal_factor * 0.9)) * (0.85 + random() * 0.3))::numeric, 2);
                
                -- Boundaries
                min_p := ROUND((price_val * 0.75)::numeric, 2);
                max_p := ROUND((price_val * 1.3)::numeric, 2);

                -- Insert record
                INSERT INTO market_data 
                (district_id, commodity_id, market_name, arrival_date, quantity_kg, min_price, max_price, modal_price)
                VALUES 
                (dist_rec.id, comm_rec.id, dist_rec.name, curr_date, qty_val, min_p, max_p, price_val)
                ON CONFLICT (district_id, commodity_id, arrival_date) DO NOTHING;

                curr_date := curr_date + 7;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
