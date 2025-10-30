"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const inversify_1 = require("inversify");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const di_types_1 = require("../types/di.types");
const config_1 = __importDefault(require("../config/config"));
const errorHandler_1 = require("../middlewares/errorHandler");
let AuthService = class AuthService {
    constructor(userRepository, userEventsPublisher) {
        this.userRepository = userRepository;
        this.userEventsPublisher = userEventsPublisher;
        this.SALT_ROUNDS = 10;
    }
    async register(registerDto) {
        const { email, password, firstName, lastName } = registerDto;
        const existingUser = await this.userRepository.findUserByEmail(email);
        if (existingUser) {
            throw new errorHandler_1.AppError('User with this email already exists', 400);
        }
        const hashedPassword = await bcrypt_1.default.hash(password, this.SALT_ROUNDS);
        const user = await this.userRepository.createUser({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'user',
        });
        await this.userEventsPublisher.onUserRegistered(user);
        const token = this.generateToken(user.id, user.email);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                emailVerified: user.emailVerified,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userRepository.findUserByEmail(email);
        if (!user) {
            throw new errorHandler_1.AppError('Invalid credentials', 401);
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError('Invalid credentials', 401);
        }
        const token = this.generateToken(user.id, user.email);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                emailVerified: user.emailVerified,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        };
    }
    generateToken(userId, email) {
        if (!config_1.default.jwt.privateKey) {
            throw new Error('JWT private key not configured');
        }
        const payload = {
            userId,
            email,
        };
        return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.privateKey, {
            algorithm: 'RS256',
            expiresIn: '7d',
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(di_types_1.TYPES.UserRepository)),
    __param(1, (0, inversify_1.inject)(di_types_1.TYPES.UserEventsPublisher)),
    __metadata("design:paramtypes", [Object, Object])
], AuthService);
