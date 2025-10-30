"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const container_1 = __importDefault(require("../config/container"));
const di_types_1 = require("../types/di.types");
const config_1 = __importDefault(require("../config/config"));
const router = (0, express_1.Router)();
const userController = container_1.default.get(di_types_1.TYPES.UserController);
router.get('/me', auth_1.authenticateToken, userController.getCurrentUser);
router.get('/:id', auth_1.authenticateToken, (0, auth_1.requirePermissions)(config_1.default.adminPermissions), userController.getUserById);
router.get('/', auth_1.authenticateToken, (0, auth_1.requirePermissions)(config_1.default.adminPermissions), userController.getAllUsers);
exports.default = router;
