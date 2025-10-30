import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';

interface JwtPayload {
  userId: string;
  email: string;
  permissions?: string[];
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const token = authHeader.substring(7);

    if (!config.jwt.publicKey) {
      return res.status(500).json({ message: 'JWT public key not configured' });
    }

    jwt.verify(
      token,
      config.jwt.publicKey,
      {
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Invalid token', error: err.message });
        }

        req.user = decoded as JwtPayload;
        next();
      },
    );
  } catch (error) {
    next(error);
  }
};

export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(perm => 
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
};

export type { AuthenticatedRequest, JwtPayload };

