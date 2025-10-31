import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { asyncContext, RequestContext } from '../logging/context';

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const traceparent = req.headers['traceparent'] as string | undefined;

  res.setHeader('X-Request-ID', requestId);

  const context: RequestContext = {
    requestId,
    traceparent,
  };

  req.context = context;

  asyncContext.run(context, () => {
    next();
  });
};

