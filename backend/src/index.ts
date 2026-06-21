import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import crawlerRoutes from './routes/crawlerRoutes';
import { runCrawler } from './etl/crawler';

const app = express();

// Middlewares
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/crawler', crawlerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', env: config.nodeEnv });
});

// Setup Scheduled Cron Job: Runs daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Starting scheduled daily crawler run...');
  try {
    const status = await runCrawler();
    console.log(`✅ Scheduled crawler completed. Records inserted: ${status.recordsInserted}`);
  } catch (error) {
    console.error('❌ Scheduled crawler failed:', error);
  }
});

// Start Server
app.listen(config.port, () => {
  console.log(`🚀 Agriculture Forecasting Backend running on port ${config.port}`);
  console.log(`📅 Scheduled crawler registered (runs daily at midnight)`);
});
