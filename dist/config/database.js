"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const config_1 = __importDefault(require("./config"));
const user_1 = require("../models/user");
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: config_1.default.database.host,
    port: config_1.default.database.port,
    username: config_1.default.database.username,
    password: config_1.default.database.password,
    database: config_1.default.database.database,
    synchronize: false,
    logging: config_1.default.database.logging,
    entities: [user_1.User],
    migrations: ["migrations/*.ts"],
    migrationsTableName: "user_service_migrations",
    subscribers: [],
});
exports.default = AppDataSource;
