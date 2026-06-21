import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  // Get token from header or cookie
  let token = req.headers.authorization?.split(' ')[1];

  if (!token && req.headers.cookie) {
    // Basic parser for cookie
    const cookies = req.headers.cookie.split(';').reduce((acc: any, c: string) => {
      const [key, val] = c.trim().split('=');
      acc[key] = val;
      return acc;
    }, {});
    token = cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
