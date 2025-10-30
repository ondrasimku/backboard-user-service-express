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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQEventPublisher = void 0;
const inversify_1 = require("inversify");
const amqplib_1 = require("amqplib");
const config_1 = __importDefault(require("../config/config"));
let RabbitMQEventPublisher = class RabbitMQEventPublisher {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.retryConfig = {
            maxRetries: 10,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2,
        };
        this.exchange = config_1.default.rabbitmq.exchange;
        this.connectionOptions = this.parseConnectionOptions(config_1.default.rabbitmq.url, config_1.default.rabbitmq.vhost);
    }
    parseConnectionOptions(url, vhost) {
        try {
            const parsedUrl = new URL(url);
            return {
                protocol: parsedUrl.protocol.replace(':', ''),
                hostname: parsedUrl.hostname,
                port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5672,
                username: parsedUrl.username || 'guest',
                password: parsedUrl.password || 'guest',
                vhost: vhost,
                heartbeat: 60,
            };
        }
        catch (error) {
            console.error('Failed to parse RabbitMQ URL:', error);
            throw new Error('Invalid RabbitMQ URL configuration');
        }
    }
    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    calculateBackoff(attempt) {
        const delay = Math.min(this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt), this.retryConfig.maxDelayMs);
        const jitter = Math.random() * 0.1 * delay;
        return Math.floor(delay + jitter);
    }
    async connect() {
        if (this.isConnected && this.connection && this.channel) {
            return;
        }
        let lastError = null;
        for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
            try {
                console.log(`Attempting to connect to RabbitMQ (attempt ${attempt + 1}/${this.retryConfig.maxRetries})...`);
                this.connection = await (0, amqplib_1.connect)(this.connectionOptions);
                this.channel = await this.connection.createChannel();
                await this.channel.assertExchange(this.exchange, 'topic', {
                    durable: true,
                });
                this.isConnected = true;
                this.connection.on('error', (err) => {
                    console.error('RabbitMQ connection error:', err);
                    this.isConnected = false;
                });
                this.connection.on('close', () => {
                    console.log('RabbitMQ connection closed');
                    this.isConnected = false;
                });
                console.log(`Successfully connected to RabbitMQ exchange: ${this.exchange}`);
                return;
            }
            catch (error) {
                lastError = error;
                const isLastAttempt = attempt === this.retryConfig.maxRetries - 1;
                console.error(`Failed to connect to RabbitMQ (attempt ${attempt + 1}/${this.retryConfig.maxRetries}):`, error instanceof Error ? error.message : error);
                if (isLastAttempt) {
                    console.error('Max retry attempts reached. Could not connect to RabbitMQ.');
                    throw new Error(`Failed to connect to RabbitMQ after ${this.retryConfig.maxRetries} attempts: ${lastError.message}`);
                }
                const backoffDelay = this.calculateBackoff(attempt);
                console.log(`Retrying in ${backoffDelay}ms...`);
                await this.sleep(backoffDelay);
            }
        }
    }
    async publish(routingKey, payload) {
        if (!this.channel || !this.isConnected) {
            console.warn(`RabbitMQ not connected. Skipping event publish for routing key: ${routingKey}`);
            try {
                await this.connect();
                if (!this.channel) {
                    return;
                }
            }
            catch (error) {
                console.error('Failed to reconnect to RabbitMQ:', error);
                return;
            }
        }
        try {
            const message = Buffer.from(JSON.stringify(payload));
            this.channel.publish(this.exchange, routingKey, message, {
                persistent: true,
                contentType: 'application/json',
                timestamp: Date.now(),
            });
            console.log(`Published event to ${this.exchange} with routing key: ${routingKey}`);
        }
        catch (error) {
            console.error('Failed to publish event:', error);
            this.isConnected = false;
        }
    }
    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            this.isConnected = false;
            console.log('Disconnected from RabbitMQ');
        }
        catch (error) {
            console.error('Error disconnecting from RabbitMQ:', error);
            throw error;
        }
    }
};
exports.RabbitMQEventPublisher = RabbitMQEventPublisher;
exports.RabbitMQEventPublisher = RabbitMQEventPublisher = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], RabbitMQEventPublisher);
