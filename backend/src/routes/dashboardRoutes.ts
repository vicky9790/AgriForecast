import { Router } from 'express';
import { getDistricts, getCommodities, getHistory, getPredictions } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/districts', authMiddleware, getDistricts);
router.get('/commodities', authMiddleware, getCommodities);
router.get('/history', authMiddleware, getHistory);
router.get('/predictions', authMiddleware, getPredictions);

export default router;
