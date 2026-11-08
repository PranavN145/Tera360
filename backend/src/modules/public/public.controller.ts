import { Request, Response, NextFunction } from 'express';
import { publicService } from './public.service';

export class PublicController {
  async getRiskMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await publicService.getRiskMap(req.query as any);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alerts, pagination } = await publicService.getPublishedAlerts(req.query as any);
      res.status(200).json({
        success: true,
        data: alerts,
        pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRoadStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await publicService.getRoadStatus(req.query as any);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await publicService.getStats();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();

