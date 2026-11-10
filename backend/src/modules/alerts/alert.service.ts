import mongoose from 'mongoose';
import { Alert, IAlert } from './alert.model';
import { AlertDelivery, DeliveryChannel } from './alertDelivery.model';
import { AuditLog } from '../audit/auditLog.model';
import { Notification } from '../notifications/notification.model';
import { User } from '../users/user.model';

export class AlertServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = 'ALERT_ERROR', statusCode = 400) {
    super(message);
    this.name = 'AlertServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AlertService {
  async createDraft(payload: any, officerId?: mongoose.Types.ObjectId): Promise<IAlert> {
    const alert = new Alert({
      ...payload,
      status: 'draft',
      createdBy: officerId,
    });

    await alert.save();

    await AuditLog.create({
      userId: officerId,
      action: 'ALERT_DRAFT_CREATED',
      resourceType: 'Alert',
      resourceId: alert._id.toString(),
      details: { title: alert.title, severity: alert.severity, corridor: alert.corridor },
      timestamp: new Date(),
    });

    return alert;
  }

  async listAlerts(query: {
    state?: string;
    severity?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ alerts: IAlert[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isDeleted: false };
    if (query.state) {
      filter.state = new RegExp(query.state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (query.severity) {
      filter.severity = query.severity;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Alert.countDocuments(filter),
    ]);

    return {
      alerts: alerts as unknown as IAlert[],
      total,
      page,
      limit,
    };
  }

  async getAlertById(id: string): Promise<IAlert> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AlertServiceError(`Alert with ID '${id}' not found`, 'NOT_FOUND', 404);
    }

    const alert = await Alert.findOne({ _id: id, isDeleted: false });
    if (!alert) {
      throw new AlertServiceError(`Alert with ID '${id}' not found`, 'NOT_FOUND', 404);
    }
    return alert;
  }

  async previewAlert(id: string): Promise<{
    alertId: string;
    previews: {
      channel: string;
      language: string;
      text: string;
    }[];
  }> {
    const alert = await this.getAlertById(id);

    const defaultChannels = (alert.channels && alert.channels.length > 0)
      ? alert.channels
      : ['sms', 'ivrs', 'push', 'app'];

    const previews: { channel: string; language: string; text: string }[] = [];

    for (const ch of defaultChannels) {
      if (ch === 'sms') {
        previews.push({
          channel: 'sms',
          language: 'en',
          text: `[TERRA360 ${alert.severity.toUpperCase()} ALERT] ${alert.title}. ${alert.advisory}. Avoid ${alert.corridor}. NSDMA`,
        });
      } else if (ch === 'ivrs') {
        previews.push({
          channel: 'ivrs',
          language: 'en',
          text: `Emergency broadcast from State Disaster Management Authority. A ${alert.severity} landslide warning is active on ${alert.corridor}. ${alert.advisory}. Please seek designated shelters.`,
        });
      } else {
        previews.push({
          channel: ch,
          language: 'en',
          text: `${alert.title} — ${alert.advisory}`,
        });
      }
    }

    return {
      alertId: alert._id.toString(),
      previews,
    };
  }

  async approveAlert(
    id: string,
    confirm = false,
    officerId?: mongoose.Types.ObjectId,
    officerEmail?: string
  ): Promise<{ alert: IAlert; queuedRecipients: number }> {
    const alert = await this.getAlertById(id);

    if (alert.status === 'published') {
      // Idempotent success (PRD §14.3)
      const existingDeliveries = await AlertDelivery.countDocuments({ alertId: alert._id });
      return { alert, queuedRecipients: existingDeliveries };
    }

    if (alert.status === 'cancelled') {
      throw new AlertServiceError('Cannot approve a cancelled alert', 'CONFLICT', 409);
    }

    // Business rule: Critical alerts require an explicit confirmation flag (PRD §14.2)
    if (alert.severity === 'Critical' && !confirm) {
      throw new AlertServiceError(
        'Critical alert broadcast requires explicit confirmation (confirm: true).',
        'CONFIRMATION_REQUIRED',
        400
      );
    }

    alert.status = 'published';
    alert.publishedAt = new Date();
    alert.approvedBy = officerId;
    alert.approvedAt = new Date();
    await alert.save();

    // Query potential recipients for broadcast
    const targetRoles = alert.audience?.roles || ['citizen', 'driver', 'field_officer'];
    const recipients = await User.find({
      role: { $in: targetRoles },
      isActive: true,
    })
      .limit(500)
      .lean();

    const channels: DeliveryChannel[] = (alert.channels as DeliveryChannel[]) || ['app', 'sms', 'push'];
    const deliveryDocs: any[] = [];

    for (const recipient of recipients) {
      for (const ch of channels) {
        deliveryDocs.push({
          alertId: alert._id,
          recipientId: recipient._id,
          recipientContact: recipient.email || recipient.phone || 'app-push-target',
          recipientRole: recipient.role,
          channel: ch,
          status: 'delivered', // Mock immediate delivery in sandbox
          sentAt: new Date(),
          deliveredAt: new Date(),
          retryCount: 0,
        });
      }

      // Create in-app notification
      await Notification.create({
        userId: recipient._id,
        title: `🚨 ${alert.severity} Alert: ${alert.title}`,
        message: alert.advisory,
        type: 'alert',
        entityId: alert._id.toString(),
      });
    }

    if (deliveryDocs.length > 0) {
      await AlertDelivery.insertMany(deliveryDocs);
    }

    // Write AuditLog (PRD §14.3)
    await AuditLog.create({
      userId: officerId,
      userEmail: officerEmail,
      role: 'officer',
      action: 'ALERT_APPROVED_AND_BROADCAST',
      resourceType: 'Alert',
      resourceId: alert._id.toString(),
      details: {
        severity: alert.severity,
        corridor: alert.corridor,
        queuedRecipients: deliveryDocs.length,
      },
      timestamp: new Date(),
    });

    return {
      alert,
      queuedRecipients: deliveryDocs.length,
    };
  }

  async cancelAlert(id: string, reason?: string, officerId?: mongoose.Types.ObjectId): Promise<IAlert> {
    const alert = await this.getAlertById(id);

    alert.status = 'cancelled';
    await alert.save();

    await AuditLog.create({
      userId: officerId,
      action: 'ALERT_CANCELLED',
      resourceType: 'Alert',
      resourceId: alert._id.toString(),
      details: { reason },
      timestamp: new Date(),
    });

    return alert;
  }

  async getDeliveries(alertId: string): Promise<{
    alertId: string;
    total: number;
    delivered: number;
    failed: number;
    queued: number;
    deliveries: any[];
  }> {
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      throw new AlertServiceError('Invalid alert ID', 'NOT_FOUND', 404);
    }

    const deliveries = await AlertDelivery.find({ alertId }).sort({ createdAt: -1 }).limit(100).lean();

    const delivered = deliveries.filter((d) => d.status === 'delivered').length;
    const failed = deliveries.filter((d) => d.status === 'failed').length;
    const queued = deliveries.filter((d) => d.status === 'queued').length;

    return {
      alertId,
      total: deliveries.length,
      delivered,
      failed,
      queued,
      deliveries,
    };
  }

  async retryFailedDeliveries(alertId: string): Promise<{ retriedCount: number }> {
    const res = await AlertDelivery.updateMany(
      { alertId, status: 'failed' },
      { $set: { status: 'delivered', deliveredAt: new Date() }, $inc: { retryCount: 1 } }
    );

    return { retriedCount: res.modifiedCount };
  }
}

export const alertService = new AlertService();
