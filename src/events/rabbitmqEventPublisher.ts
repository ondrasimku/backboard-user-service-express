import { injectable } from 'inversify';
import { connect, ChannelModel, Channel, Options } from 'amqplib';
import { IEventPublisher, EventPayload } from './eventPublisher';
import config from '../config/config';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

@injectable()
export class RabbitMQEventPublisher implements IEventPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly exchange: string;
  private readonly connectionOptions: Options.Connect;
  private isConnected = false;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 10,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  };

  constructor() {
    this.exchange = config.rabbitmq.exchange;
    this.connectionOptions = this.parseConnectionOptions(
      config.rabbitmq.url,
      config.rabbitmq.vhost
    );
  }

  private parseConnectionOptions(url: string, vhost: string): Options.Connect {
    try {
      const parsedUrl = new URL(url);
      
      return {
        protocol: parsedUrl.protocol.replace(':', '') as 'amqp' | 'amqps',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5672,
        username: parsedUrl.username || 'guest',
        password: parsedUrl.password || 'guest',
        vhost: vhost,
        heartbeat: 60,
      };
    } catch (error) {
      console.error('Failed to parse RabbitMQ URL:', error);
      throw new Error('Invalid RabbitMQ URL configuration');
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelayMs
    );
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.connection && this.channel) {
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(
          `Attempting to connect to RabbitMQ (attempt ${attempt + 1}/${this.retryConfig.maxRetries})...`
        );

        this.connection = await connect(this.connectionOptions);
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
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === this.retryConfig.maxRetries - 1;
        
        console.error(
          `Failed to connect to RabbitMQ (attempt ${attempt + 1}/${this.retryConfig.maxRetries}):`,
          error instanceof Error ? error.message : error
        );

        if (isLastAttempt) {
          console.error('Max retry attempts reached. Could not connect to RabbitMQ.');
          throw new Error(
            `Failed to connect to RabbitMQ after ${this.retryConfig.maxRetries} attempts: ${lastError.message}`
          );
        }

        const backoffDelay = this.calculateBackoff(attempt);
        console.log(`Retrying in ${backoffDelay}ms...`);
        await this.sleep(backoffDelay);
      }
    }
  }

  async publish(routingKey: string, payload: EventPayload): Promise<void> {
    if (!this.channel || !this.isConnected) {
      console.warn(`RabbitMQ not connected. Skipping event publish for routing key: ${routingKey}`);
      
      try {
        await this.connect();
        
        if (!this.channel) {
          return;
        }
      } catch (error) {
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
    } catch (error) {
      console.error('Failed to publish event:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
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
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
      throw error;
    }
  }
}
