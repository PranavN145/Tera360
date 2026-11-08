import { Request, Response, NextFunction } from 'express';
import { contactService } from './contact.service';

export class ContactController {
  async submitContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use Express's validated req.ip governed by trusted proxy configuration (PRD §13.1, §15)
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string | undefined;

      const contact = await contactService.submitContact(req.body, {
        ipAddress,
        userAgent,
      });

      res.status(201).json({
        success: true,
        message: 'Your message has been received. Our operations desk will get in touch shortly.',
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();

