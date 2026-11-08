import bcrypt from 'bcryptjs';
import { User, IUser } from '../users/user.model';
import { RegisterInput, LoginInput } from './auth.schema';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { hashToken, generateRandomToken } from '../../utils/crypto';
import { emailService } from '../../services/email.service';
import { AuthError } from '../../middleware/requireAuth';

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  code = 'BAD_REQUEST';
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class AuthService {
  /**
   * Register a new citizen or driver (Staff accounts are invite-only)
   */
  async register(input: RegisterInput): Promise<IUser> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists.');
    }

    // Hash password with bcryptjs (cost >= 10)
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Generate single-use verification token
    const rawVerificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role, // Schema enforces 'citizen' or 'driver'
      phone: input.phone,
      language: input.language || 'en',
      emailVerified: false,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpiresAt: verificationExpiresAt,
      isActive: true,
    });

    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.name, rawVerificationToken);

    return user;
  }

  /**
   * Login with email and password, with lockout after 5 failed attempts
   */
  async login(
    input: LoginInput,
    meta: { userAgent?: string; ip?: string }
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: input.email }).select(
      '+passwordHash +refreshTokens +lockedUntil +failedLogins'
    );

    // Generic error message to prevent account enumeration
    const invalidCredentialsError = new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);

    if (!user || user.isDeleted || !user.isActive) {
      throw invalidCredentialsError;
    }

    // Check account lockout
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil!.getTime() - Date.now()) / (60 * 1000)
      );
      throw new AuthError(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        'ACCOUNT_LOCKED',
        401
      );
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      user.failedLogins += 1;
      if (user.failedLogins >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }
      await user.save();
      throw invalidCredentialsError;
    }

    // Login successful — reset failed attempts and lockout
    user.failedLogins = 0;
    user.lockedUntil = undefined;

    // Issue JWT Access Token (15m)
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Issue JWT Refresh Token (7d)
    const tokenId = generateRandomToken(16);
    const refreshToken = signRefreshToken({
      sub: user._id.toString(),
      jti: tokenId,
    });

    // Store hashed refresh token session in DB
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const now = new Date();

    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }

    // Prune expired sessions (where expiresAt <= now)
    user.refreshTokens = user.refreshTokens.filter((s) => s.expiresAt > now);

    // Limit active sessions to 10 max: revoke oldest active session if limit reached
    const activeSessions = user.refreshTokens.filter(
      (s) => s.status === 'active' || !s.status
    );
    if (activeSessions.length >= 10) {
      const oldestActive = activeSessions[0];
      oldestActive.status = 'revoked';
      oldestActive.revokedAt = now;
      oldestActive.revocationReason = 'user_revoked';
    }

    // Never slice or discard unexpired 'rotated' tombstones:
    // They are required to detect token reuse attacks during their entire 7-day TTL.
    // If bounded storage is needed for excessive non-critical history (>200 items),
    // prune non-critical 'user_revoked' or 'logout' tombstones, never unexpired 'rotated' or 'active' ones.
    if (user.refreshTokens.length > 200) {
      const criticalSessions = user.refreshTokens.filter(
        (s) => s.status === 'active' || s.status === 'rotated'
      );
      const nonCriticalSessions = user.refreshTokens.filter(
        (s) => s.status !== 'active' && s.status !== 'rotated'
      );
      user.refreshTokens = [...nonCriticalSessions.slice(-50), ...criticalSessions];
    }

    user.refreshTokens.push({
      hash: refreshTokenHash,
      status: 'active',
      createdAt: now,
      expiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    await user.save();

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh session with token tombstone lifecycle & reuse detection.
   * - Active token: Rotated to 'rotated', new active session created and issued.
   * - Rotated token: Replay attack detected! Revokes all active sessions for user.
   * - Revoked token: Returns 401 SESSION_REVOKED without affecting other active sessions.
   * - Unknown token: Returns 401 INVALID_REFRESH_TOKEN without affecting other active sessions.
   */
  async refresh(
    rawRefreshToken: string,
    meta: { userAgent?: string; ip?: string }
  ): Promise<{ accessToken: string; newRefreshToken: string }> {
    let payload: { sub: string; jti?: string };
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AuthError(
        'Invalid or expired refresh token. Please sign in again.',
        'INVALID_REFRESH_TOKEN',
        401
      );
    }

    const currentHash = hashToken(rawRefreshToken);
    const now = new Date();

    // Prepare new refresh token ahead of time
    const newJti = generateRandomToken(16);
    const newRefreshToken = signRefreshToken({
      sub: payload.sub,
      jti: newJti,
    });
    const newHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newSessionRecord = {
      hash: newHash,
      status: 'active' as const,
      createdAt: now,
      expiresAt: newExpiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    };

    // ATOMIC ROTATION:
    // Transition an active (or legacy unversioned) session to 'rotated' atomically.
    // If concurrent requests arrive with the same token, only one succeeds here.
    const rotatedUser = await User.findOneAndUpdate(
      {
        _id: payload.sub,
        isActive: true,
        isDeleted: false,
        refreshTokens: {
          $elemMatch: {
            hash: currentHash,
            expiresAt: { $gt: now },
            $or: [
              { status: 'active' },
              { status: { $exists: false } },
              { status: null },
            ],
          },
        },
      },
      {
        $set: {
          'refreshTokens.$.status': 'rotated',
          'refreshTokens.$.replacedByTokenHash': newHash,
        },
      },
      { new: true }
    );

    if (rotatedUser) {
      // Rotation succeeded atomically: push new active session record
      await User.updateOne(
        { _id: payload.sub },
        {
          $push: { refreshTokens: newSessionRecord },
        }
      );

      // Prune expired sessions in DB to preserve strictly bounded storage
      // without discarding unexpired rotated tombstones
      await User.updateOne(
        { _id: payload.sub },
        {
          $pull: { refreshTokens: { expiresAt: { $lte: now } } },
        }
      );

      // Issue new access token (15m)
      const accessToken = signAccessToken({
        sub: rotatedUser._id.toString(),
        email: rotatedUser.email,
        role: rotatedUser.role,
      });

      return { accessToken, newRefreshToken };
    }

    // Atomic rotation did not match: Inspect the user and session state to determine exact failure cause
    const user = await User.findById(payload.sub).select(
      '+refreshTokens +isActive +isDeleted'
    );
    if (!user || !user.isActive || user.isDeleted) {
      throw new AuthError('User account not found or deactivated.', 'UNAUTHORIZED', 401);
    }

    const existingSession = (user.refreshTokens || []).find((t) => t.hash === currentHash);

    // 1. Unknown token (JWT valid signature, but hash not in DB)
    if (!existingSession) {
      throw new AuthError(
        'Invalid refresh token. Please sign in again.',
        'INVALID_REFRESH_TOKEN',
        401
      );
    }

    // 2. Expired session
    if (existingSession.expiresAt <= now) {
      throw new AuthError(
        'Invalid or expired refresh token. Please sign in again.',
        'INVALID_REFRESH_TOKEN',
        401
      );
    }

    // 3. Revoked session: Reject cleanly without revoking other active sessions
    if (existingSession.status === 'revoked') {
      throw new AuthError(
        'This session has been revoked. Please sign in again.',
        'SESSION_REVOKED',
        401
      );
    }

    // 4. Rotated session: Token replay attack detected! Revoke all active sessions for this user.
    if (existingSession.status === 'rotated') {
      console.warn(
        `⚠️ Security Alert: Refresh token reuse detected for user ${user._id}! Revoking all active sessions.`
      );
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'refreshTokens.$[elem].status': 'revoked',
            'refreshTokens.$[elem].revokedAt': now,
            'refreshTokens.$[elem].revocationReason': 'token_reuse',
          },
        },
        {
          arrayFilters: [{ 'elem.status': { $in: ['active', null] } }],
        }
      );
      throw new AuthError(
        'Session invalidation detected. All active sessions have been revoked. Please sign in again.',
        'TOKEN_REUSE_DETECTED',
        401
      );
    }

    // Fallback
    throw new AuthError(
      'Invalid refresh token. Please sign in again.',
      'INVALID_REFRESH_TOKEN',
      401
    );
  }

  /**
   * Logout user and mark refresh token session as revoked with reason 'logout'
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      const user = await User.findById(payload.sub).select('+refreshTokens');
      if (user && user.refreshTokens) {
        const hash = hashToken(rawRefreshToken);
        const session = user.refreshTokens.find((t) => t.hash === hash);
        if (session) {
          session.status = 'revoked';
          session.revokedAt = new Date();
          session.revocationReason = 'logout';
          await user.save();
        }
      }
    } catch {
      // Ignore invalid or expired token during logout
    }
  }

  /**
   * Verify email using hashed single-use token
   */
  async verifyEmail(rawToken: string): Promise<void> {
    const hashed = hashToken(rawToken);

    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpiresAt');

    if (!user) {
      throw new BadRequestError('Invalid or expired email verification token.');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
  }

  /**
   * Request password reset link (always returns generic response to prevent email enumeration)
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpiresAt');

    if (user && user.isActive && !user.isDeleted) {
      const rawToken = generateRandomToken(32);
      user.passwordResetToken = hashToken(rawToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      await emailService.sendPasswordResetEmail(user.email, user.name, rawToken);
    }
  }

  /**
   * Reset password with single-use token & revoke all existing sessions
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hashed = hashToken(rawToken);

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordHash +passwordResetToken +passwordResetExpiresAt +refreshTokens');

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token.');
    }

    // Hash new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;

    // Security best practice: Revoke all existing sessions on password reset with tombstones
    const now = new Date();
    for (const session of user.refreshTokens || []) {
      if (session.status === 'active' || !session.status) {
        session.status = 'revoked';
        session.revokedAt = now;
        session.revocationReason = 'reset_password';
      }
    }
    user.failedLogins = 0;
    user.lockedUntil = undefined;

    await user.save();
  }
}

export const authService = new AuthService();

