export class ResourceNotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Asserts resource ownership. Per PRD §13.4 and §13.10, always throws 404
 * (not 403) to prevent resource existence enumeration.
 */
export function assertOwnership(ownerId: string, currentUserId: string, message = 'Resource not found'): void {
  if (ownerId !== currentUserId) {
    throw new ResourceNotFoundError(message);
  }
}

