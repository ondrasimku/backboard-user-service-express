import crypto from 'crypto';

/**
 * Generates a stable kid (key ID) from a public key.
 * This matches the algorithm used in JwksController to ensure consistency.
 * 
 * @param publicKey - The RSA public key in PEM format
 * @returns The kid (first 8 characters of SHA256 hash in base64)
 */
export function generateKid(publicKey: string): string {
  const keyHash = crypto.createHash('sha256').update(publicKey).digest('base64');
  return keyHash.substring(0, 8);
}

