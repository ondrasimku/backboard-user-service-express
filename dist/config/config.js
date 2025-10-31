"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
/**
 * Load JWT keys from files or environment variables
 * Priority: 1. File-based keys (keys/private.pem, keys/public.pem)
 *          2. Environment variables (JWT_PRIVATE_KEY, JWT_PUBLIC_KEY)
 */
function loadJwtKeys() {
    const keysDir = path_1.default.join(__dirname, '..', '..', 'keys');
    const privateKeyPath = path_1.default.join(keysDir, 'private.pem');
    const publicKeyPath = path_1.default.join(keysDir, 'public.pem');
    let privateKey = '';
    let publicKey = '';
    // Try loading from files first
    if (fs_1.default.existsSync(privateKeyPath) && fs_1.default.existsSync(publicKeyPath)) {
        privateKey = fs_1.default.readFileSync(privateKeyPath, 'utf-8');
        publicKey = fs_1.default.readFileSync(publicKeyPath, 'utf-8');
        console.log('JWT keys loaded from files (keys/private.pem, keys/public.pem)');
    }
    // Fall back to environment variables
    else if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
        privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
        publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
        console.log('JWT keys loaded from environment variables');
    }
    else {
        console.warn('Warning: No JWT keys found. Generate them using: npm run generate-keys');
    }
    return { privateKey, publicKey };
}
const jwtKeys = loadJwtKeys();
exports.config = {
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
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://backboard:backboardpass@backboard-rabbitmq:5672',
        vhost: process.env.RABBITMQ_VHOST || '/',
        exchange: process.env.RABBITMQ_EXCHANGE || 'user.events',
    },
    adminPermissions: (process.env.ADMIN_PERMISSIONS || 'read:users,write:users').split(','),
};
exports.default = exports.config;
