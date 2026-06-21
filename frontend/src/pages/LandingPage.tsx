import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShieldAlert, Cpu, Database, ChevronRight, Activity } from 'lucide-react';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <Activity className="logo-icon" />
          <span>AgriForecast</span>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn-secondary nav-btn">Login</Link>
          <Link to="/signup" className="btn-primary nav-btn">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge">Official Tamil Nadu AgTech Platform</div>
          <h1 className="hero-title">
            Predicting the Future of
            Agriculture Markets
          </h1>
          <p className="hero-subtitle">
            Empowering farmers, traders, and policymakers in Tamil Nadu with state-of-the-art 
            Prophet time-series models and rule-based Explainable AI forecasting.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary hero-btn">
              Access Forecasting Dashboard <ChevronRight size={18} />
            </Link>
            <a href="#features" className="btn-secondary hero-btn">
              Explore Features
            </a>
          </div>
        </div>

        {/* Visual Mockup Card */}
        <div className="hero-preview">
          <div className="preview-header">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
            <span className="preview-title">Tomato Forecast – Dharmapuri District</span>
          </div>
          <div className="preview-chart-mock">
            <div className="chart-bar-mock">
              <span className="bar-label">Current Qty: 22,000 kg</span>
              <div className="bar-fill qty-current"></div>
            </div>
            <div className="chart-bar-mock">
              <span className="bar-label">Forecasted Qty (Next Month): 22,800 kg (+3.6%)</span>
              <div className="bar-fill qty-forecast"></div>
            </div>
            <div className="preview-explanation">
              <div className="exp-badge">Explainable AI Reasoning</div>
              <p>"Tomato arrivals in Dharmapuri are predicted to increase next month due to peak summer harvesting patterns. This increase in supply will likely drive prices down..."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">High-Precision Forecasting Features</h2>
        <p className="section-subtitle">Combining official data sources with robust AI algorithms.</p>
        
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <Database className="feature-icon" />
            </div>
            <h3>Government Data Source</h3>
            <p>Direct integration with AGMARKNET and Tamil Nadu Open Data Portal ensuring 100% official and reliable agricultural dataset inputs.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <Cpu className="feature-icon" />
            </div>
            <h3>Prophet Forecasting</h3>
            <p>Utilizes Meta's Prophet time-series model analyzing seasonality, weekly trends, and historical fluctuations for optimal prediction.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <ShieldAlert className="feature-icon" />
            </div>
            <h3>Explainable AI (XAI)</h3>
            <p>Never query black-box models blindly. Our system provides crystal-clear rule-based logic explaining exactly why quantity and prices fluctuate.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <TrendingUp className="feature-icon" />
            </div>
            <h3>Interactive Charts</h3>
            <p>Beautiful, fully responsive Recharts visualizations tracking 12-month historical statistics, price limits, and forecasted futures.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 AgriForecast Tamil Nadu. Built with React + FastAPI + Prophet.</p>
      </footer>
    </div>
  );
};
