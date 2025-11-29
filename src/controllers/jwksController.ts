import { Request, Response } from 'express';
import crypto from 'crypto';
import config from '../config/config';
import { ILogger } from '../logging/logger.interface';
import { injectable, inject } from 'inversify';
import { TYPES } from '../types/di.types';

interface JWK {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
}

@injectable()
export class JwksController {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  /**
   * Converts RSA public key PEM to JWK format
   */
  private pemToJwk(publicKeyPem: string, kid: string = 'default'): JWK {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const jwk = publicKey.export({ format: 'jwk' }) as crypto.JsonWebKey;

    return {
      kty: jwk.kty || 'RSA',
      use: 'sig',
      kid,
      alg: 'RS256',
      n: jwk.n || '',
      e: jwk.e || '',
    };
  }

  /**
   * GET /.well-known/jwks.json
   * Returns the public keys in JWKS format for JWT verification
   */
  getJwks = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!config.jwt.publicKey) {
        this.logger.error('JWKS endpoint: Public key not configured');
        res.status(500).json({ error: 'JWKS endpoint not available' });
        return;
      }

      // Generate a stable kid from the public key (first 8 chars of base64 hash)
      const keyHash = crypto.createHash('sha256').update(config.jwt.publicKey).digest('base64');
      const kid = keyHash.substring(0, 8);

      const jwk = this.pemToJwk(config.jwt.publicKey, kid);

      // Return JWKS format
      res.json({
        keys: [jwk],
      });
    } catch (error) {
      this.logger.error('Error generating JWKS', error as Error);
      res.status(500).json({ error: 'Failed to generate JWKS' });
    }
  };
}

