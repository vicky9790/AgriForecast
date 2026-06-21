import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Activity, 
  LogOut, 
  RefreshCw, 
  User,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './DashboardPage.css';

const API_BASE = 'http://localhost:5000/api/dashboard';
const CRAWLER_API = 'http://localhost:5000/api/crawler';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Selection states
  const [districts, setDistricts] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  
  // Data states
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any | null>(null);
  
  // Loading & status states
  const [loading, setLoading] = useState(true);
  const [predLoading, setPredLoading] = useState(false);
  const [crawlerStatus, setCrawlerStatus] = useState<any>(null);
  const [crawlerRunning, setCrawlerRunning] = useState(false);
  const [crawlerMsg, setCrawlerMsg] = useState<string>('');

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const distRes = await axios.get(`${API_BASE}/districts`);
        setDistricts(distRes.data);
        if (distRes.data.length > 0) {
          setSelectedDistrict(distRes.data[0].id.toString());
        }
      } catch (err) {
        console.error('Error loading districts:', err);
      }
    };
    fetchDistricts();
  }, []);

  // Fetch commodities dynamically when selectedDistrict changes
  useEffect(() => {
    const fetchCommodities = async () => {
      if (!selectedDistrict) return;
      try {
        const commRes = await axios.get(`${API_BASE}/commodities`, {
          params: { districtId: selectedDistrict }
        });
        setCommodities(commRes.data);
        if (commRes.data.length > 0) {
          const hasCurrent = commRes.data.some((c: any) => c.id.toString() === selectedCommodity);
          if (!hasCurrent) {
            setSelectedCommodity(commRes.data[0].id.toString());
          }
        } else {
          setSelectedCommodity('');
        }
      } catch (err) {
        console.error('Error loading commodities:', err);
      }
    };
    fetchCommodities();
  }, [selectedDistrict]);

  // Fetch historical data and predictions when selections change
  const fetchData = async () => {
    if (!selectedDistrict || !selectedCommodity) {
      setHistoricalData([]);
      setPrediction(null);
      return;
    }
    setLoading(true);
    setPredLoading(true);
    try {
      // Fetch 12 months history
      const historyRes = await axios.get(`${API_BASE}/history`, {
        params: {
          districtId: selectedDistrict,
          commodityId: selectedCommodity
        }
      });
      setHistoricalData(historyRes.data);

      // Fetch Predictions
      const predRes = await axios.get(`${API_BASE}/predictions`, {
        params: {
          districtId: selectedDistrict,
          commodityId: selectedCommodity
        }
      });
      setPrediction(predRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setPredLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDistrict, selectedCommodity]);

  // Handle manual crawler trigger
  const handleTriggerCrawler = async () => {
    setCrawlerRunning(true);
    setCrawlerMsg('Triggering AGMARKNET ETL crawler pipeline...');
    try {
      const res = await axios.post(`${CRAWLER_API}/run`);
      setCrawlerStatus(res.data.status);
      
      // Start polling status
      pollCrawlerStatus();
    } catch (err) {
      setCrawlerMsg('Failed to trigger crawler.');
      setCrawlerRunning(false);
    }
  };

  // Poll crawler status every 2 seconds
  const pollCrawlerStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${CRAWLER_API}/status`);
        const status = res.data;
        setCrawlerStatus(status);
        
        if (status.status === 'completed' || status.status === 'error') {
          clearInterval(interval);
          setCrawlerRunning(false);
          setCrawlerMsg(status.message);
          // Reload dashboard data to pick up newly crawled records!
          fetchData();
        } else {
          setCrawlerMsg(status.message);
        }
      } catch (err) {
        clearInterval(interval);
        setCrawlerRunning(false);
        setCrawlerMsg('Error occurred while fetching crawler status.');
      }
    }, 2000);
  };

  // Helper calculations for summary indicators
  const latestRecord = historicalData[historicalData.length - 1];
  const avgPrice = historicalData.reduce((acc, curr) => acc + parseFloat(curr.modalPrice), 0) / (historicalData.length || 1);
  const maxPriceRecord = historicalData.reduce((max, curr) => parseFloat(curr.modalPrice) > parseFloat(max.modalPrice) ? curr : max, historicalData[0] || { modalPrice: 0 });

  // Format dates for charts
  const chartData = historicalData.map(item => ({
    ...item,
    formattedDate: new Date(item.arrivalDate).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit'
    }),
    quantity: parseFloat(item.quantityKg),
    price: parseFloat(item.modalPrice)
  }));

  return (
    <div className="dashboard-container">
      {/* Header bar */}
      <header className="dashboard-header">
        <div className="header-brand">
          <Activity className="logo-icon" />
          <span>AgriForecast</span>
        </div>
        
        <div className="header-user">
          <div className="user-info">
            <User size={16} className="user-icon" />
            <span>{user?.name}</span>
          </div>
          <button 
            onClick={handleTriggerCrawler} 
            disabled={crawlerRunning}
            className="btn-secondary logout-btn"
            style={{ marginRight: '8px' }}
          >
            <RefreshCw size={14} className={crawlerRunning ? 'spin' : ''} />
            {crawlerRunning ? 'Syncing...' : 'Sync Market Data'}
          </button>
          <button onClick={logout} className="btn-secondary logout-btn">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="dashboard-content">
        {/* Dashboard Title */}
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px' }}>
          Agricultural Market Analytics Dashboard
        </h1>

        {/* Filters Section (district & commodity horizontally) */}
        <section className="controls-bar">
          <div className="selectors">
            <div className="selector-group">
              <label>District</label>
              <select 
                value={selectedDistrict} 
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label>Commodity</label>
              <select 
                value={selectedCommodity} 
                onChange={(e) => setSelectedCommodity(e.target.value)}
              >
                {commodities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Crawler message status indicator */}
        {(crawlerMsg || crawlerRunning) && (
          <div className={`crawler-status-banner ${crawlerStatus?.status || 'idle'}`}>
            <AlertCircle size={16} />
            <span>{crawlerMsg}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="dashboard-loader">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading market data...</p>
          </div>
        ) : historicalData.length === 0 ? (
          <div className="no-predictions" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <AlertCircle size={40} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
              No historical data available for {districts.find(d => d.id.toString() === selectedDistrict)?.name} + {commodities.find(c => c.id.toString() === selectedCommodity)?.name}.
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Please synchronize market data.
            </p>
          </div>
        ) : (
          <>
            {/* Key Metrics Summary Cards */}
            <section className="kpi-grid">
              <div className="kpi-card glass-panel">
                <span className="kpi-title">Current Market Arrivals</span>
                <span className="kpi-value">
                  {latestRecord ? parseFloat(latestRecord.quantityKg).toLocaleString() : '0'} kg
                </span>
                <span className="kpi-footer">
                  Last updated: {latestRecord ? new Date(latestRecord.arrivalDate).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>

              <div className="kpi-card glass-panel">
                <span className="kpi-title">Average Modal Price</span>
                <span className="kpi-value">
                  ₹{avgPrice.toFixed(1)}/kg
                </span>
                <span className="kpi-footer">
                  Calculated over last 12 months
                </span>
              </div>

              <div className="kpi-card glass-panel">
                <span className="kpi-title">Peak Modal Price</span>
                <span className="kpi-value">
                  ₹{parseFloat(maxPriceRecord.modalPrice).toFixed(1)}/kg
                </span>
                <span className="kpi-footer">
                  Recorded on: {maxPriceRecord.arrivalDate ? new Date(maxPriceRecord.arrivalDate).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
            </section>

            {/* Forecast Section */}
            <section className="predictions-section">
              <div className="predictions-header-row">
                <h2>AI Forecast (Next Month)</h2>
                {prediction && (
                  <span className="model-version">Model: {prediction.modelVersion}</span>
                )}
              </div>

              {predLoading ? (
                <div className="pred-loading">Generating next-month forecast predictions...</div>
              ) : prediction ? (
                <div className="predictions-grid">
                  <div className="pred-card glass-panel quantity">
                    <span className="pred-label">Forecasted Arrivals</span>
                    <span className="pred-value">{Math.round(prediction.predictedQuantity).toLocaleString()} kg</span>
                    <span className="pred-compare">
                      {latestRecord ? (
                        <>
                          {prediction.predictedQuantity > latestRecord.quantityKg ? '↑ ' : '↓ '}
                          {Math.abs(((prediction.predictedQuantity - latestRecord.quantityKg) / latestRecord.quantityKg) * 100).toFixed(1)}% from previous month
                        </>
                      ) : 'N/A'}
                    </span>
                  </div>

                  <div className="pred-card glass-panel price">
                    <span className="pred-label">Forecasted Modal Price</span>
                    <span className="pred-value">₹{parseFloat(prediction.predictedPrice).toFixed(1)}/kg</span>
                    <span className="pred-compare">
                      {latestRecord ? (
                        <>
                          {prediction.predictedPrice > latestRecord.modalPrice ? '↑ ' : '↓ '}
                          {Math.abs(((prediction.predictedPrice - latestRecord.modalPrice) / latestRecord.modalPrice) * 100).toFixed(1)}% from previous month
                        </>
                      ) : 'N/A'}
                    </span>
                  </div>

                  <div className="pred-card glass-panel explanation-card" style={{ padding: '24px' }}>
                    <span className="explanation-title">Explainable AI Explanation</span>
                    <p className="explanation-text" style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                      {prediction.reason}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="no-predictions" style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  No prediction forecasts available. Click 'Sync Market Data' to update datasets.
                </div>
              )}
            </section>

            {/* Historical Trend Charts */}
            <section className="charts-grid">
              <div className="chart-container glass-panel">
                <h3>Historical Arrivals (Kilograms)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="formattedDate" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px'
                        }} 
                      />
                      <Legend />
                      <Line 
                        name="Quantity (kg)" 
                        type="monotone" 
                        dataKey="quantity" 
                        stroke="var(--primary)" 
                        strokeWidth={2} 
                        dot={{ fill: 'var(--primary)', r: 3 }}
                        activeDot={{ r: 5 }} 
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container glass-panel">
                <h3>Historical Modal Prices (INR/kg)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="formattedDate" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px'
                        }} 
                      />
                      <Legend />
                      <Line 
                        name="Price (₹/kg)" 
                        type="monotone" 
                        dataKey="price" 
                        stroke="var(--warning)" 
                        strokeWidth={2} 
                        dot={{ fill: 'var(--warning)', r: 3 }}
                        activeDot={{ r: 5 }} 
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
