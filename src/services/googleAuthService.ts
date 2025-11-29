import { OAuth2Client } from 'google-auth-library';
import { injectable, inject } from 'inversify';
import config from '../config/config';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { AppError } from '../middlewares/errorHandler';

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

export interface IGoogleAuthService {
  verifyIdToken(idToken: string): Promise<GoogleUserInfo>;
}

@injectable()
export class GoogleAuthService implements IGoogleAuthService {
  private client: OAuth2Client;

  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
  ) {
    if (!config.googleOAuth.clientId) {
      this.logger.warn('Google OAuth client ID not configured');
    }

    this.client = new OAuth2Client(config.googleOAuth.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      this.logger.info('Verifying Google ID token');

      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.googleOAuth.clientId,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new AppError('Invalid Google ID token: no payload', 401);
      }

      if (!payload.email) {
        throw new AppError('Invalid Google ID token: no email', 401);
      }

      if (!payload.sub) {
        throw new AppError('Invalid Google ID token: no user ID', 401);
      }

      this.logger.info('Google ID token verified successfully', { 
        email: payload.email,
        sub: payload.sub 
      });

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified || false,
        given_name: payload.given_name,
        family_name: payload.family_name,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      this.logger.error('Google ID token verification failed', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Invalid Google ID token', 401);
    }
  }
}

