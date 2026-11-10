import bcrypt from 'bcryptjs';
import { User, IUser } from './user.model';
import { UpdateMeInput, ChangePasswordInput } from './users.schema';
import { ResourceNotFoundError } from '../../utils/ownershipCheck';
import { hashToken } from '../../utils/crypto';
import { Report } from '../reports/report.model';

export class UserOperationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = 'BAD_REQUEST', statusCode = 400) {
    super(message);
    this.name = 'UserOperationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UsersService {
  async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }
    return user;
  }

  async updateMe(userId: string, input: UpdateMeInput): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }

    if (input.name !== undefined) user.name = input.name;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.language !== undefined) user.language = input.language;
    if (input.village !== undefined) {
      user.village = {
        state: input.village.state || '',
        district: input.village.district || '',
        villageName: input.village.villageName || '',
      };
    }
    if (input.familyContacts !== undefined) {
      user.familyContacts = input.familyContacts as any;
    }
    if (input.alertPreferences !== undefined) {
      user.alertPreferences = {
        ivrs: input.alertPreferences.ivrs,
        sms: input.alertPreferences.sms,
        app: input.alertPreferences.app,
      };
    }

    await user.save();
    return user;
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    rawRefreshToken?: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash +refreshTokens');
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }

    const isValid = await user.comparePassword(input.currentPassword);
    if (!isValid) {
      throw new UserOperationError('Current password is incorrect.', 'INVALID_CREDENTIALS', 400);
    }

    // Hash new password
    user.passwordHash = await bcrypt.hash(input.newPassword, 10);

    // Keep only current session active; revoke other active sessions with tombstone reason
    const now = new Date();
    const currentHash = rawRefreshToken ? hashToken(rawRefreshToken) : null;

    for (const session of user.refreshTokens || []) {
      if (session.status === 'active' || !session.status) {
        if (currentHash && session.hash === currentHash) {
          // Keep current device's session active
          continue;
        }
        session.status = 'revoked';
        session.revokedAt = now;
        session.revocationReason = 'password_change';
      }
    }

    user.failedLogins = 0;
    user.lockedUntil = undefined;
    await user.save();
  }

  async getSessions(userId: string, rawRefreshToken?: string) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }

    const currentHash = rawRefreshToken ? hashToken(rawRefreshToken) : null;
    const now = new Date();

    // Only return active, unexpired sessions. Never expose tombstones, hashes, or rotation metadata.
    return (user.refreshTokens || [])
      .filter(
        (session: any) =>
          (session.status === 'active' || !session.status) &&
          session.expiresAt > now
      )
      .map((session: any) => ({
        id: session._id.toString(),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent || 'Unknown client',
        ip: session.ip || 'Unknown IP',
        isCurrent: currentHash ? session.hash === currentHash : false,
      }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }

    const session = (user.refreshTokens || []).find(
      (s: any) => s._id.toString() === sessionId
    );

    // Only active sessions can be revoked; unknown or already-revoked sessions throw 404
    if (!session || (session.status !== 'active' && session.status)) {
      throw new ResourceNotFoundError('Session not found');
    }

    session.status = 'revoked';
    session.revokedAt = new Date();
    session.revocationReason = 'user_revoked';

    await user.save();
  }

  async exportUserData(userId: string) {
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }

    // Authenticated ownership: Strictly associate reports by authenticated reporterId.
    // Unverified or shared phone numbers must NEVER be used to associate reports,
    // as that would leak reports across distinct accounts sharing the same phone
    // or incorrectly assign anonymous reports to an account.
    const reports = await Report.find({
      reporterId: user._id,
      isDeleted: false,
    }).select('reportId state location hazardType severity description photoUrl status source createdAt updatedAt -_id');

    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        language: user.language,
        emailVerified: user.emailVerified,
        village: user.village || null,
        familyContacts: user.familyContacts || [],
        alertPreferences: user.alertPreferences || { ivrs: true, sms: true, app: true },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      reports: reports || [],
    };
  }

  async deleteAccount(userId: string, confirmationText: string): Promise<void> {
    if (confirmationText !== 'DELETE') {
      throw new UserOperationError(
        'Confirmation text must be DELETE',
        'CONFIRM_TEXT_MISMATCH',
        400
      );
    }

    const user = await User.findById(userId).select('+refreshTokens');
    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError('User account not found');
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;

    // Revoke all active sessions with tombstone reason 'account_deletion'
    const now = new Date();
    for (const session of user.refreshTokens || []) {
      if (session.status === 'active' || !session.status) {
        session.status = 'revoked';
        session.revokedAt = now;
        session.revocationReason = 'account_deletion';
      }
    }

    await user.save();
  }
}

export const usersService = new UsersService();
