export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface District {
  id: number;
  name: string;
}

export interface Commodity {
  id: number;
  name: string;
}

export interface MarketData {
  id: number;
  district_id: number;
  commodity_id: number;
  market_name: string;
  arrival_date: Date;
  quantity_kg: number;
  min_price: number;
  max_price: number;
  modal_price: number;
  created_at: Date;
}

export interface Prediction {
  id: number;
  district_id: number;
  commodity_id: number;
  prediction_date: Date;
  predicted_quantity: number;
  predicted_price: number;
  reason: string;
  model_version: string;
  created_at: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PredictionRequest {
  district: string;
  commodity: string;
}

export interface PredictionResponse {
  predictedQuantity: number;
  predictedPrice: number;
  reason: string;
  percentageChangeQuantity?: number;
  percentageChangePrice?: number;
}

export interface CrawlerStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  lastRun: Date | null;
  recordsInserted: number;
  message: string;
}
