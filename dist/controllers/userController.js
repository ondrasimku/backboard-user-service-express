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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const inversify_1 = require("inversify");
const errorHandler_1 = require("../middlewares/errorHandler");
const di_types_1 = require("../types/di.types");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
        this.getCurrentUser = async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new errorHandler_1.AppError('User not authenticated', 401);
                }
                const user = await this.userService.getUserById(req.user.userId);
                if (!user) {
                    res.status(404).json({ message: 'User not found. Please contact support.' });
                    return;
                }
                res.json(this.mapToUserResponse(user));
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserById = async (req, res, next) => {
            try {
                const { id } = req.params;
                const user = await this.userService.getUserById(id);
                if (!user) {
                    res.status(404).json({ message: 'User not found' });
                    return;
                }
                res.json(this.mapToUserResponse(user));
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllUsers = async (req, res, next) => {
            try {
                const users = await this.userService.getAllUsers();
                res.json(users.map((user) => this.mapToUserResponse(user)));
            }
            catch (error) {
                next(error);
            }
        };
    }
    mapToUserResponse(user) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
};
exports.UserController = UserController;
exports.UserController = UserController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(di_types_1.TYPES.UserService)),
    __metadata("design:paramtypes", [Object])
], UserController);
