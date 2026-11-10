import { Request, Response, NextFunction } from 'express';
import { roadService } from './road.service';

export class RoadController {
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const road = await roadService.updateStatus(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: `Road '${road.code}' status updated to '${road.status}'.`,
        data: road,
      });
    } catch (error) {
      next(error);
    }
  }

  async getImpactedRoads(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roads = await roadService.getImpactedRoads();
      res.status(200).json({
        success: true,
        count: roads.length,
        data: roads,
      });
    } catch (error) {
      next(error);
    }
  }

  async computeSafeRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await roadService.computeSafeRoute(req.body);
      res.status(200).json({
        success: true,
        data: route,
      });
    } catch (error) {
      next(error);
    }
  }

  async listSafeRoutes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routes = await roadService.listSafeRoutes();
      res.status(200).json({
        success: true,
        data: routes,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const roadController = new RoadController();

