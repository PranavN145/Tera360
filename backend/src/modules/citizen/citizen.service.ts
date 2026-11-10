import mongoose from 'mongoose';
import { IUser } from '../users/user.model';
import { Village, IVillage } from '../villages/village.model';
import { Shelter, IShelter } from '../villages/shelter.model';
import { Alert } from '../alerts/alert.model';
import { CheckIn, ICheckIn, CheckInStatus } from './checkin.model';
import { Notification, INotification } from '../notifications/notification.model';
import { emailService, escapeHtml } from '../../services/email.service';

export class CitizenService {
  async getAreaInfo(user: IUser): Promise<{
    village: Partial<IVillage> | null;
    rainfall24h: number;
    saturationIndex: number;
    riskLevel: string;
    evacuationStatus: string;
    activeAlerts: any[];
    emergencyContacts: any[];
  }> {
    const villageName = user.village?.villageName || 'Phesama';
    const state = user.village?.state || 'Nagaland';

    let village = await Village.findOne({
      villageName: new RegExp(`^${villageName.trim()}$`, 'i'),
      isDeleted: false,
    }).populate('primaryShelterId').lean();

    if (!village) {
      // Fallback to first available village in user's state
      village = await Village.findOne({
        state: new RegExp(`^${state.trim()}$`, 'i'),
        isDeleted: false,
      }).populate('primaryShelterId').lean();
    }

    const alerts = await Alert.find({
      state: new RegExp(`^${state.trim()}$`, 'i'),
      status: 'published',
      isDeleted: false,
    })
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();

    const emergencyContacts = village?.contactPersons || [
      { name: 'District Disaster Emergency Operations Center', phone: '1077', designation: 'EOC Helpline' },
      { name: 'State Disaster Response Force (SDRF)', phone: '112', designation: 'Emergency Response' },
    ];

    return {
      village: village as Partial<IVillage> | null,
      rainfall24h: village?.rainfall24h || 76,
      saturationIndex: village?.saturationIndex || 68,
      riskLevel: village?.riskLevel || 'Moderate',
      evacuationStatus: village?.evacuationStatus || 'Normal',
      activeAlerts: alerts,
      emergencyContacts,
    };
  }

  async getAreaMap(user: IUser): Promise<{
    centerCoordinates: [number, number];
    villageName: string;
    riskZones: any[];
    shelters: any[];
  }> {
    const villageName = user.village?.villageName || 'Phesama';
    const state = user.village?.state || 'Nagaland';

    const village = await Village.findOne({
      villageName: new RegExp(`^${villageName.trim()}$`, 'i'),
    }).lean();

    const centerCoords: [number, number] = village?.coordinates?.coordinates || [94.112, 25.642];

    const shelters = await Shelter.find({
      $or: [
        { villageName: new RegExp(`^${villageName.trim()}$`, 'i') },
        { state: new RegExp(`^${state.trim()}$`, 'i') },
      ],
      isActive: true,
    }).lean();

    // Simplified polygon zones around the village
    const riskZones = [
      {
        id: 'zone-high-ground',
        name: 'Upper Village Safe Ridge (High Ground)',
        riskLevel: 'Low',
        color: '#22c55e',
        coordinates: [
          [centerCoords[0] - 0.005, centerCoords[1] + 0.005],
          [centerCoords[0] + 0.005, centerCoords[1] + 0.005],
          [centerCoords[0] + 0.003, centerCoords[1] + 0.001],
          [centerCoords[0] - 0.003, centerCoords[1] + 0.001],
        ],
      },
      {
        id: 'zone-steep-slope',
        name: 'Lower Valley Highway Cut (Landslide Runoff)',
        riskLevel: village?.riskLevel || 'High',
        color: village?.riskLevel === 'Critical' ? '#ef4444' : '#f97316',
        coordinates: [
          [centerCoords[0] - 0.008, centerCoords[1] - 0.002],
          [centerCoords[0] + 0.008, centerCoords[1] - 0.002],
          [centerCoords[0] + 0.006, centerCoords[1] - 0.008],
          [centerCoords[0] - 0.006, centerCoords[1] - 0.008],
        ],
      },
    ];

    return {
      centerCoordinates: centerCoords,
      villageName: village?.villageName || villageName,
      riskZones,
      shelters,
    };
  }

  async getSafePlace(user: IUser): Promise<{
    primaryShelter: Partial<IShelter> | null;
    alternativeShelters: Partial<IShelter>[];
    evacuationRouteInstructions: string[];
  }> {
    const villageName = user.village?.villageName || 'Phesama';
    const state = user.village?.state || 'Nagaland';

    const shelters = await Shelter.find({
      $or: [
        { villageName: new RegExp(`^${villageName.trim()}$`, 'i') },
        { state: new RegExp(`^${state.trim()}$`, 'i') },
      ],
      isActive: true,
    })
      .sort({ capacity: -1 })
      .lean();

    const primary = shelters[0] ? (shelters[0] as unknown as Partial<IShelter>) : null;
    const alternatives = shelters.slice(1) as unknown as Partial<IShelter>[];

    return {
      primaryShelter: primary,
      alternativeShelters: alternatives,
      evacuationRouteInstructions: [
        'Move immediately uphill towards designated high-ground concrete structures.',
        'Avoid following riverbanks, natural storm runoff channels, and steep highway cut slopes.',
        'Carry pre-packaged emergency water, essential medications, and waterproof documentation.',
        'Report in-person to the shelter registration desk upon arrival to update the family safety roll.',
      ],
    };
  }

  async submitCheckIn(
    user: IUser,
    payload: {
      status: CheckInStatus;
      message?: string;
      locationName?: string;
      coordinates?: { type: 'Point'; coordinates: [number, number] };
    }
  ): Promise<ICheckIn> {
    const familyContacts = (user.familyContacts || []).map((c) => ({
      name: c.name,
      phone: c.phone,
      channel: 'sms' as const,
      deliveryStatus: 'sent' as const,
    }));

    const checkIn = new CheckIn({
      userId: user._id,
      status: payload.status,
      message: payload.message || (payload.status === 'safe' ? "I am safe and currently at high ground." : "I require emergency assistance!"),
      locationName: payload.locationName || user.village?.villageName || 'Current Location',
      coordinates: payload.coordinates,
      notifiedContacts: familyContacts,
      timestamp: new Date(),
    });

    await checkIn.save();

    // If user has family contacts with email or phone, dispatch email notification
    if (user.email) {
      try {
        const safeStatus = payload.status === 'safe' ? 'SAFE' : 'NEEDS ASSISTANCE';
        await emailService.sendEmail({
          to: user.email,
          subject: `[Terra360 Family Safety] Check-In Recorded: ${user.name} is ${safeStatus}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; line-height: 1.5;">
              <h2 style="color: ${payload.status === 'safe' ? '#16a34a' : '#dc2626'};">
                Family Safety Status: ${safeStatus}
              </h2>
              <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
              <p><strong>Location:</strong> ${escapeHtml(checkIn.locationName || '')}</p>
              <p><strong>Time:</strong> ${checkIn.timestamp.toLocaleString()}</p>
              <p><strong>Message:</strong></p>
              <blockquote style="background: #f3f4f6; padding: 10px; border-left: 4px solid #16a34a;">
                ${escapeHtml(checkIn.message || '')}
              </blockquote>
            </div>
          `,
          text: `${user.name} checked in as ${safeStatus} at ${checkIn.locationName}. Message: ${checkIn.message}`,
        });
      } catch (err: any) {
        console.warn('Family checkin email notification failed:', err.message);
      }
    }

    return checkIn;
  }

  async listCheckIns(userId: mongoose.Types.ObjectId): Promise<ICheckIn[]> {
    return CheckIn.find({ userId }).sort({ timestamp: -1 }).limit(20).lean() as unknown as ICheckIn[];
  }

  async getOfflineBundle(user: IUser): Promise<{
    version: string;
    generatedAt: string;
    user: {
      name: string;
      village: any;
      familyContacts: any[];
    };
    designatedShelters: any[];
    emergencyContacts: any[];
    safetyProtocols: {
      title: string;
      steps: string[];
    }[];
  }> {
    const area = await this.getAreaInfo(user);
    const safePlace = await this.getSafePlace(user);

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      user: {
        name: user.name,
        village: user.village,
        familyContacts: user.familyContacts || [],
      },
      designatedShelters: [
        ...(safePlace.primaryShelter ? [safePlace.primaryShelter] : []),
        ...safePlace.alternativeShelters,
      ],
      emergencyContacts: area.emergencyContacts,
      safetyProtocols: [
        {
          title: 'During Heavy Torrential Downpour',
          steps: [
            'Inspect residential perimeter for sudden springs of muddy water or fresh retaining wall cracks.',
            'Keep battery-powered FM radio and mobile devices fully charged.',
            'Never sleep in rooms immediately abutting steep earth cut banks.',
          ],
        },
        {
          title: 'Immediate Evacuation Protocol',
          steps: [
            'Immediately depart downhill mud paths and move perpendicular to slope runoff contours.',
            'Report to community shelter and maintain registration accountability.',
            'Do not attempt to cross flooded causeways or debris streams on foot or by vehicle.',
          ],
        },
      ],
    };
  }

  async listNotifications(userId: mongoose.Types.ObjectId, role?: string): Promise<INotification[]> {
    const filter: Record<string, any> = {
      $or: [
        { userId },
        { targetRole: role || 'citizen' },
        { userId: null, targetRole: null },
      ],
    };

    return Notification.find(filter).sort({ createdAt: -1 }).limit(30).lean() as unknown as INotification[];
  }

  async markNotificationRead(id: string, userId: mongoose.Types.ObjectId): Promise<void> {
    await Notification.findOneAndUpdate(
      {
        _id: id,
        $or: [{ userId }, { userId: null }],
      },
      { isRead: true, readAt: new Date() }
    );
  }

  async markAllNotificationsRead(userId: mongoose.Types.ObjectId): Promise<void> {
    await Notification.updateMany(
      {
        $or: [{ userId }, { userId: null }],
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );
  }
}

export const citizenService = new CitizenService();
