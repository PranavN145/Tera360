import { Request, Response, NextFunction } from 'express';
import { officerService } from './officer.service';

export class OfficerController {
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await officerService.getDashboard();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDataStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await officerService.getDataStatus();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const officerController = new OfficerController();

