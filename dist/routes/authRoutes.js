"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = __importDefault(require("../config/container"));
const di_types_1 = require("../types/di.types");
const router = (0, express_1.Router)();
const authController = container_1.default.get(di_types_1.TYPES.AuthController);
router.post('/register', authController.register);
router.post('/login', authController.login);
exports.default = router;
