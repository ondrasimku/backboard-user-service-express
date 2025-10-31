import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { diag, DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import container from './config/container';
import { ILogger } from './logging/logger.interface';
import { TYPES } from './types/di.types';

const logger = container.get<ILogger>(TYPES.Logger);
const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

class PinoDiagLogger implements DiagLogger {
  private errorCount = 0;
  private readonly MAX_ERRORS = 3;

  debug(message: string, ...args: unknown[]): void {
    logger.debug(message, { args });
  }

  info(message: string, ...args: unknown[]): void {
    logger.info(message, { args });
  }

  warn(message: string, ...args: unknown[]): void {
    logger.warn(message, { args });
  }

  error(message: string, ...args: unknown[]): void {
    if (this.errorCount >= this.MAX_ERRORS) {
      return;
    }

    this.errorCount++;
    const [firstArg] = args;
    
    if (this.errorCount === this.MAX_ERRORS) {
      logger.warn('Suppressing further OpenTelemetry errors to reduce noise');
      return;
    }

    if (firstArg instanceof Error) {
      logger.error(message, firstArg);
    } else if (args.length > 0) {
      logger.error(message, undefined, { args });
    } else {
      logger.error(message);
    }
  }

  verbose(message: string, ...args: unknown[]): void {
    logger.debug(message, { args });
  }
}

diag.setLogger(new PinoDiagLogger(), DiagLogLevel.ERROR);

let sdk: NodeSDK | undefined;

if (OTEL_ENABLED && OTEL_ENDPOINT) {
  try {
    const exporter = new OTLPTraceExporter({
      url: OTEL_ENDPOINT,
      timeoutMillis: 1000,
    });

    const sdk = new NodeSDK({
      traceExporter: exporter,
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    logger.info('OpenTelemetry tracing initialized', {
      endpoint: OTEL_ENDPOINT,
    });
  } catch (error) {
    logger.error(
      'Failed to initialize OpenTelemetry - continuing without tracing',
      error instanceof Error ? error : new Error(String(error))
    );
  }
} else {
  logger.info('OpenTelemetry tracing disabled', {
    enabled: OTEL_ENABLED,
    endpointConfigured: !!OTEL_ENDPOINT,
  });
}

export async function shutdownTracing() {
  if (sdk) {
    await sdk.shutdown();
  }
}