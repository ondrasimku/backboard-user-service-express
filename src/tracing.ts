import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { diag, DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import container from './config/container';
import { ILogger, LogContext } from './logging/logger.interface';
import { TYPES } from './types/di.types';

const logger = container.get<ILogger>(TYPES.Logger);
const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';
const OTEL_PROTOCOL = (process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc').toLowerCase();
const OTEL_TRACES_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
const OTEL_BASE_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'user-service';

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
    /*
    Handling fucking opentelemetry exceptions like an ape.
    */
    this.errorCount++;
    if (this.errorCount === this.MAX_ERRORS) {
      logger.warn('Suppressing further OpenTelemetry errors to reduce noise');
      return;
    }
    
    let error: Error | undefined;
    let context: LogContext = {};
    const [firstArg] = args;

    try {
      if (message.startsWith('{') && message.includes('stack')) {
        const parsed = JSON.parse(message);
        
        const syntheticError = new Error(parsed.message || 'OpenTelemetry Exporter Error');
        syntheticError.stack = parsed.stack;
        
        context = parsed;
        error = syntheticError;
        message = parsed.message || message; 
      }
    } catch (e) {
    }

    if (!error && firstArg instanceof Error) {
      error = firstArg;
    }

    logger.error(message, error, context);
  }

  verbose(message: string, ...args: unknown[]): void {
    logger.debug(message, { args });
  }
}

diag.setLogger(new PinoDiagLogger(), DiagLogLevel.ERROR);

let sdk: NodeSDK | undefined;

(async () => {
  const endpoint = OTEL_TRACES_ENDPOINT || OTEL_BASE_ENDPOINT;
  
  if (OTEL_ENABLED && endpoint) {
    try {
      const isHttpProtocol = OTEL_PROTOCOL === 'http/protobuf' || OTEL_PROTOCOL === 'http';
      
      let exporterUrl = endpoint;
      if (!OTEL_TRACES_ENDPOINT && OTEL_BASE_ENDPOINT && isHttpProtocol) {
        exporterUrl = OTEL_BASE_ENDPOINT.endsWith('/') 
          ? `${OTEL_BASE_ENDPOINT}v1/traces`
          : `${OTEL_BASE_ENDPOINT}/v1/traces`;
      } else if (!isHttpProtocol) {
        exporterUrl = exporterUrl.replace(/\/v1\/traces\/?$/, '');
      }
      
      let exporter;
      if (isHttpProtocol) {
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
        exporter = new OTLPTraceExporter({
          url: exporterUrl,
          timeoutMillis: 1000,
        });
      } else {
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-grpc');
        exporter = new OTLPTraceExporter({
          url: exporterUrl,
          timeoutMillis: 1000,
        });
      }

      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: OTEL_SERVICE_NAME,
      });

      sdk = new NodeSDK({
        resource,
        traceExporter: exporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': { enabled: true },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true },
            '@opentelemetry/instrumentation-amqplib': { enabled: true },
          }),
        ],
      });

      sdk.start();
      logger.info('OpenTelemetry tracing initialized', {
        serviceName: OTEL_SERVICE_NAME,
        endpoint: exporterUrl,
        protocol: OTEL_PROTOCOL,
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
      endpointConfigured: !!endpoint,
    });
  }
})();

export async function shutdownTracing() {
  if (sdk) {
    await sdk.shutdown();
  }
}