"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config/config"));
const initDatabase_1 = require("./config/initDatabase");
const container_1 = __importDefault(require("./config/container"));
const di_types_1 = require("./types/di.types");
const startServer = async () => {
    try {
        await (0, initDatabase_1.initializeDatabase)();
        const eventPublisher = container_1.default.get(di_types_1.TYPES.EventPublisher);
        try {
            await eventPublisher.connect();
        }
        catch (error) {
            console.warn('Failed to connect to RabbitMQ. Server will continue without event publishing:', error);
        }
        app_1.default.listen(config_1.default.port, () => {
            console.log(`Server running on port ${config_1.default.port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
