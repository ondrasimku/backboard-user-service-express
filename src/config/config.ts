import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ debug: false });

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres';
  logging: boolean;
}

interface JwtConfig {
  privateKey: string;
  publicKey: string;
  expiresIn: string;
  issuer: string;
  audience: string;
}

interface RabbitMQConfig {
  url: string;
  vhost: string;
  exchange: string;
}

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

interface Config {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
  rabbitmq: RabbitMQConfig;
  googleOAuth: GoogleOAuthConfig;
  adminPermissions: string[];
}

/**
 * Load JWT keys from files or environment variables
 * Priority: 1. File-based keys (keys/private.pem, keys/public.pem)
 *          2. Environment variables (JWT_PRIVATE_KEY, JWT_PUBLIC_KEY)
 */
function loadJwtKeys(): { privateKey: string; publicKey: string } {
  const keysDir = path.join(__dirname, '..', '..', 'keys');
  const privateKeyPath = path.join(keysDir, 'private.pem');
  const publicKeyPath = path.join(keysDir, 'public.pem');

  let privateKey = '';
  let publicKey = '';

  // Try loading from files first
  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
  } 
  // Fall back to environment variables
  else if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  }

  return { privateKey, publicKey };
}

const jwtKeys = loadJwtKeys();

export const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'userservice',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development',
  },
  jwt: {
    privateKey: jwtKeys.privateKey,
    publicKey: jwtKeys.publicKey,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: process.env.JWT_ISSUER || process.env.USER_SERVICE_BASE_URL || 'http://localhost:3000',
    audience: process.env.JWT_AUDIENCE || 'backboard',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://backboard:backboardpass@backboard-rabbitmq:5672',
    vhost: process.env.RABBITMQ_VHOST || '/',
    exchange: process.env.RABBITMQ_EXCHANGE || 'user.events',
  },
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  adminPermissions: (process.env.ADMIN_PERMISSIONS || 'read:users,write:users').split(','),
};

export default config;