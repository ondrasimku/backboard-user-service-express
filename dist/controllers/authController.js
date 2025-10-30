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
exports.AuthController = void 0;
const inversify_1 = require("inversify");
const di_types_1 = require("../types/di.types");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.register = async (req, res, next) => {
            try {
                const registerDto = req.body;
                if (!registerDto.email || !registerDto.password || !registerDto.firstName || !registerDto.lastName) {
                    res.status(400).json({ message: 'Email, password, firstName, and lastName are required' });
                    return;
                }
                const result = await this.authService.register(registerDto);
                res.status(201).json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.login = async (req, res, next) => {
            try {
                const loginDto = req.body;
                if (!loginDto.email || !loginDto.password) {
                    res.status(400).json({ message: 'Email and password are required' });
                    return;
                }
                const result = await this.authService.login(loginDto);
                res.json(result);
            }
            catch (error) {
                next(error);
            }
        };
    }
};
exports.AuthController = AuthController;
exports.AuthController = AuthController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(di_types_1.TYPES.AuthService)),
    __metadata("design:paramtypes", [Object])
], AuthController);
