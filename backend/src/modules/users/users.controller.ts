import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

function clearRefreshTokenCookie(res: Response): void {
  const isSecure = env.COOKIE_SAMESITE === 'none' || env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN !== 'localhost' ? env.COOKIE_DOMAIN : undefined,
    path: '/api/v1/auth',
  });
}

export class UsersController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateMe(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      await usersService.changePassword(req.user!.id, req.body, rawRefreshToken);
      res.status(200).json({
        success: true,
        data: {
          message: 'Password has been updated successfully. Other active sessions have been signed out.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      const sessions = await usersService.getSessions(req.user!.id, rawRefreshToken);
      res.status(200).json({
        success: true,
        data: {
          sessions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.revokeSession(req.user!.id, req.params.id);
      res.status(200).json({
        success: true,
        data: {
          message: 'Session has been revoked.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usersService.exportUserData(req.user!.id);
      const filename = `terra360-account-data-${req.user!.id}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).send(JSON.stringify(data, null, 2));
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.deleteAccount(req.user!.id, req.body.confirmationText);
      clearRefreshTokenCookie(res);
      res.status(200).json({
        success: true,
        data: {
          message: 'Your account and personal data have been permanently deactivated.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
