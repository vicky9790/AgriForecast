import { Router } from 'express';
import { triggerCrawler, getCrawlerStatus } from '../controllers/crawlerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/run', authMiddleware, triggerCrawler);
router.get('/status', authMiddleware, getCrawlerStatus);

export default router;
