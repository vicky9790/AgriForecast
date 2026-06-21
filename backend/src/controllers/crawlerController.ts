import { Request, Response } from 'express';
import { runCrawler, getStatus } from '../etl/crawler';

export const triggerCrawler = async (req: Request, res: Response) => {
  try {
    // Run crawler in background (non-blocking)
    runCrawler().catch((err) => {
      console.error('Background crawler error:', err);
    });

    return res.status(200).json({
      message: 'Crawler triggered successfully',
      status: getStatus()
    });
  } catch (error) {
    console.error('Trigger crawler error:', error);
    return res.status(500).json({ error: 'Failed to trigger crawler' });
  }
};

export const getCrawlerStatus = (req: Request, res: Response) => {
  return res.status(200).json(getStatus());
};
