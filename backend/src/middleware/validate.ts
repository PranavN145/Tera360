import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

export interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export class AppValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  fields: Record<string, string[]>;

  constructor(fields: Record<string, string[]>, message = 'Validation failed') {
    super(message);
    this.name = 'AppValidationError';
    this.fields = fields;
  }
}

export function validate(schema: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as any;
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.') || 'body';
          if (!fields[path]) {
            fields[path] = [];
          }
          fields[path].push(issue.message);
        }
        next(new AppValidationError(fields, 'Validation failed'));
      } else {
        next(error);
      }
    }
  };
}
