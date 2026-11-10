import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Village, EvacuationStatus } from './village.model';
import { Shelter } from './shelter.model';
import { AuditLog } from '../audit/auditLog.model';

export class VillageController {
  async listVillages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { state, district, riskLevel, evacuationStatus } = req.query as Record<string, string>;
      const filter: Record<string, any> = { isDeleted: false };

      if (state && state !== 'All' && state !== 'All States') {
        filter.state = new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
      if (district && district !== 'All') {
        filter.district = new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
      if (riskLevel && riskLevel !== 'All') {
        filter.riskLevel = riskLevel;
      }
      if (evacuationStatus && evacuationStatus !== 'All') {
        filter.evacuationStatus = evacuationStatus;
      }

      const villages = await Village.find(filter).populate('primaryShelterId').sort({ villageName: 1 }).lean();

      res.status(200).json({
        success: true,
        count: villages.length,
        data: villages,
      });
    } catch (error) {
      next(error);
    }
  }

  async getVillageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const village = await Village.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { villageName: id },
        ].filter(Boolean),
        isDeleted: false,
      }).populate('primaryShelterId');

      if (!village) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Village '${id}' not found.` },
        });
        return;
      }

      // Also fetch all shelters associated with this village or district
      const shelters = await Shelter.find({
        $or: [
          { villageName: village.villageName },
          { district: village.district, state: village.state },
        ],
        isActive: true,
      }).lean();

      res.status(200).json({
        success: true,
        data: {
          ...village.toJSON(),
          shelters,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEvacuationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { evacuationStatus, notes } = req.body as { evacuationStatus: EvacuationStatus; notes?: string };

      const village = await Village.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { villageName: id },
        ].filter(Boolean),
      });

      if (!village) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Village '${id}' not found.` },
        });
        return;
      }

      const previousStatus = village.evacuationStatus;
      village.evacuationStatus = evacuationStatus;
      if (notes) village.notes = notes;
      await village.save();

      await AuditLog.create({
        userId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        userEmail: req.user?.email,
        role: req.user?.role || 'officer',
        action: 'VILLAGE_EVACUATION_STATUS_UPDATED',
        resourceType: 'Village',
        resourceId: village.villageName,
        details: { previousStatus, newStatus: evacuationStatus, notes },
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Village '${village.villageName}' evacuation status updated to '${evacuationStatus}'.`,
        data: village,
      });
    } catch (error) {
      next(error);
    }
  }

  async listShelters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { state, district, villageName } = req.query as Record<string, string>;
      const filter: Record<string, any> = { isActive: true };

      if (state && state !== 'All') {
        filter.state = new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
      if (district && district !== 'All') {
        filter.district = new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
      if (villageName) {
        filter.villageName = new RegExp(villageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }

      const shelters = await Shelter.find(filter).sort({ name: 1 }).lean();

      res.status(200).json({
        success: true,
        count: shelters.length,
        data: shelters,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const villageController = new VillageController();
