import { Router } from 'express';
import { signup, login, logout, getProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authMiddleware, getProfile);

export default router;
