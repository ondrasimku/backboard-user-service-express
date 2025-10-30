"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermissions = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config/config"));
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Missing or invalid token' });
        }
        const token = authHeader.substring(7);
        if (!config_1.default.jwt.publicKey) {
            return res.status(500).json({ message: 'JWT public key not configured' });
        }
        jsonwebtoken_1.default.verify(token, config_1.default.jwt.publicKey, {
            algorithms: ['RS256'],
        }, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid token', error: err.message });
            }
            req.user = decoded;
            next();
        });
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateToken = authenticateToken;
const requirePermissions = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));
        if (!hasPermission) {
            return res.status(403).json({
                message: 'Insufficient permissions',
                required: requiredPermissions,
            });
        }
        next();
    };
};
exports.requirePermissions = requirePermissions;
