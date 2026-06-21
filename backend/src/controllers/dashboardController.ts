import { Request, Response } from 'express';
import pool from '../config/database';
import { getAIPredictions } from '../services/aiService';

export const getDistricts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM districts ORDER BY name ASC');
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch districts error:', error);
    return res.status(500).json({ error: 'Failed to retrieve districts' });
  }
};

export const getCommodities = async (req: Request, res: Response) => {
  const { districtId } = req.query;
  try {
    let query = 'SELECT * FROM commodities ORDER BY name ASC';
    const params: any[] = [];
    if (districtId) {
      query = `
        SELECT DISTINCT c.id, c.name 
        FROM commodities c 
        JOIN market_data md ON md.commodity_id = c.id 
        WHERE md.district_id = $1 
        ORDER BY c.name ASC
      `;
      params.push(districtId);
    }
    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch commodities error:', error);
    return res.status(500).json({ error: 'Failed to retrieve commodities' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  const { districtId, commodityId, startDate, endDate } = req.query;

  if (!districtId || !commodityId) {
    return res.status(400).json({ error: 'districtId and commodityId are required' });
  }

  try {
    let query = `
      SELECT 
        id, 
        district_id as "districtId", 
        commodity_id as "commodityId", 
        market_name as "marketName", 
        arrival_date as "arrivalDate", 
        quantity_kg as "quantityKg", 
        min_price as "minPrice", 
        max_price as "maxPrice", 
        modal_price as "modalPrice"
      FROM market_data 
      WHERE district_id = $1 AND commodity_id = $2
    `;

    const params: any[] = [districtId, commodityId];

    if (startDate) {
      params.push(startDate);
      query += ` AND arrival_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND arrival_date <= $${params.length}`;
    }

    query += ' ORDER BY arrival_date ASC';

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve historical data' });
  }
};

export const getPredictions = async (req: Request, res: Response) => {
  const { districtId, commodityId } = req.query;

  if (!districtId || !commodityId) {
    return res.status(400).json({ error: 'districtId and commodityId are required' });
  }

  try {
    // 1. Get district and commodity names
    const districtRes = await pool.query('SELECT name FROM districts WHERE id = $1', [districtId]);
    const commodityRes = await pool.query('SELECT name FROM commodities WHERE id = $1', [commodityId]);

    if (districtRes.rows.length === 0 || commodityRes.rows.length === 0) {
      return res.status(404).json({ error: 'District or Commodity not found' });
    }

    const districtName = districtRes.rows[0].name;
    const commodityName = commodityRes.rows[0].name;

    // 2. Determine prediction date (1 month ahead of the latest historical date)
    const latestDateRes = await pool.query(
      'SELECT MAX(arrival_date) as last_date FROM market_data WHERE district_id = $1 AND commodity_id = $2',
      [districtId, commodityId]
    );

    let baseDate = new Date();
    if (latestDateRes.rows[0].last_date) {
      baseDate = new Date(latestDateRes.rows[0].last_date);
    }

    const predictionDate = new Date(baseDate);
    predictionDate.setMonth(predictionDate.getMonth() + 1);
    const predictionDateStr = predictionDate.toISOString().split('T')[0];

    // 3. Check if prediction already exists in database
    const existingPrediction = await pool.query(
      `SELECT 
        id, 
        district_id as "districtId", 
        commodity_id as "commodityId", 
        prediction_date as "predictionDate", 
        predicted_quantity as "predictedQuantity", 
        predicted_price as "predictedPrice", 
        reason, 
        model_version as "modelVersion"
      FROM predictions 
      WHERE district_id = $1 AND commodity_id = $2 AND prediction_date = $3`,
      [districtId, commodityId, predictionDateStr]
    );

    if (existingPrediction.rows.length > 0) {
      return res.status(200).json(existingPrediction.rows[0]);
    }

    // 4. If not exists, fetch predictions from AI service
    const aiResponse = await getAIPredictions(districtName, commodityName);

    // 5. Save prediction in database
    const insertRes = await pool.query(
      `INSERT INTO predictions 
       (district_id, commodity_id, prediction_date, predicted_quantity, predicted_price, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING 
         id, 
         district_id as "districtId", 
         commodity_id as "commodityId", 
         prediction_date as "predictionDate", 
         predicted_quantity as "predictedQuantity", 
         predicted_price as "predictedPrice", 
         reason, 
         model_version as "modelVersion"`,
      [
        districtId,
        commodityId,
        predictionDateStr,
        aiResponse.predictedQuantity,
        aiResponse.predictedPrice,
        aiResponse.reason,
      ]
    );

    return res.status(200).json(insertRes.rows[0]);
  } catch (error) {
    console.error('Get/Generate predictions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve/generate predictions' });
  }
};
