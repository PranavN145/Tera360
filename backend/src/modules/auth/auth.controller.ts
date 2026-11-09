import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AuthError } from '../../middleware/requireAuth';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
} from '../../utils/cookie';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: {
          user,
          message: 'Account created successfully. Please check your email to verify your address.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const { user, accessToken, refreshToken } = await authService.login(req.body, meta);
      setRefreshTokenCookie(res, refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = getRefreshTokenFromRequest(req);
      if (!rawRefreshToken) {
        throw new AuthError('Refresh token cookie missing. Please sign in.', 'UNAUTHORIZED', 401);
      }

      const meta = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const { accessToken, newRefreshToken } = await authService.refresh(rawRefreshToken, meta);
      setRefreshTokenCookie(res, newRefreshToken);

      res.status(200).json({
        success: true,
        data: {
          accessToken,
        },
      });
    } catch (error) {
      clearRefreshTokenCookie(res);
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = getRefreshTokenFromRequest(req);
      await authService.logout(rawRefreshToken);
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        data: {
          message: 'Successfully logged out.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.verifyEmail(req.body.token);
      res.status(200).json({
        success: true,
        data: {
          message: 'Email address has been successfully verified.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email);
      // Always generic message to prevent account enumeration
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.status(200).json({
        success: true,
        data: {
          message: 'Password has been successfully reset. Please log in with your new password.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

