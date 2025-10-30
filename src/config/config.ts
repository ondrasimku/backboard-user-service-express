import dotenv from 'dotenv';

dotenv.config();

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
}

interface RabbitMQConfig {
  url: string;
  vhost: string;
  exchange: string;
}

interface Config {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
  rabbitmq: RabbitMQConfig;
  adminPermissions: string[];
}

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
    privateKey: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://backboard:backboardpass@backboard-rabbitmq:5672',
    vhost: process.env.RABBITMQ_VHOST || '/',
    exchange: process.env.RABBITMQ_EXCHANGE || 'user.events',
  },
  adminPermissions: (process.env.ADMIN_PERMISSIONS || 'read:users,write:users').split(','),
};

export default config;