# Logging Module

A reusable, production-ready logging solution for Express.js microservices using Pino.

## Features

- **Structured JSON logging** for production (easy parsing by log aggregators)
- **Pretty console output** for development
- **AsyncLocalStorage-based context propagation** (automatic request correlation)
- **Multiple log levels**: `debug`, `info`, `warn`, `error`
- **Request/Response logging** with automatic HTTP metadata
- **Interface-based design** for easy testing and swapping implementations

## Architecture

```
logging/
├── logger.interface.ts      # ILogger interface for dependency injection
├── pino.logger.ts           # Pino implementation of ILogger
├── context.ts               # AsyncLocalStorage for request context
├── index.ts                 # Public exports
└── README.md                # This file

middlewares/
├── requestContext.ts        # Request ID generation & context setup
└── httpLogger.ts            # HTTP request/response logging
```

## Installation

The logging module is already configured in this service. To use it in another Express service:

1. Copy the `src/logging/` directory to your service
2. Install dependencies:
   ```bash
   npm install pino pino-pretty pino-http
   ```

## Usage

### 1. Dependency Injection Setup

Add logger to your DI container:

```typescript
// types/di.types.ts
export const TYPES = {
  Logger: Symbol.for('Logger'),
  // ... other types
};

// config/container.ts
import { ILogger } from '../logging/logger.interface';
import { PinoLoggerService } from '../logging/pino.logger';

container.bind<ILogger>(TYPES.Logger).to(PinoLoggerService).inSingletonScope();
```

### 2. Configure Middlewares

Add middlewares to your Express app:

```typescript
// app.ts
import { requestContextMiddleware } from './middlewares/requestContext';
import { createHttpLoggerMiddleware } from './middlewares/httpLogger';
import { createErrorHandler } from './middlewares/errorHandler';

const logger = container.get<ILogger>(TYPES.Logger);

app.use(requestContextMiddleware);        // Must be first
app.use(createHttpLoggerMiddleware(logger));
app.use(express.json());
// ... your routes
app.use(createErrorHandler(logger));      // Must be last
```

### 3. Use in Services

Inject the logger into your services:

```typescript
import { injectable, inject } from 'inversify';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async createUser(data: CreateUserDto) {
    this.logger.info('Creating new user', { email: data.email });
    
    try {
      const user = await this.repository.create(data);
      this.logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error as Error, { email: data.email });
      throw error;
    }
  }
}
```

## Log Levels

- **`debug`**: Development details (disabled in production)
  - Example: Database queries, cache hits, internal state
  
- **`info`**: Successful operations, startup messages
  - Example: Server started, user logged in, order placed
  
- **`warn`**: Recoverable issues, validation failures
  - Example: Invalid credentials, rate limit exceeded, deprecated API usage
  
- **`error`**: Failed operations, exceptions, errors requiring attention
  - Example: Database connection failed, payment processing error, uncaught exception

## Context Fields

Every log automatically includes:

```typescript
{
  service: "user-service",       // Service name
  timestamp: "2025-10-31T...",  // ISO timestamp
  level: "info",                // Log level
  message: "User logged in",    // Log message
  requestId: "uuid",            // From X-Request-ID header or generated
  traceparent: "00-...",        // OpenTelemetry trace (if available)
  userId: "user-123",           // Automatically added after authentication
  // ... custom context fields
}
```

## API

### ILogger Interface

```typescript
interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
}
```

### Examples

**Basic logging:**
```typescript
logger.info('Server started');
logger.warn('Rate limit exceeded');
```

**With context:**
```typescript
logger.info('User registered', { userId: '123', email: 'user@example.com' });
logger.warn('Invalid request', { path: req.path, ip: req.ip });
```

**Error logging:**
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error as Error, { 
    operation: 'riskyOperation',
    attemptNumber: 3 
  });
}
```

**Child logger (for scoped context):**
```typescript
const userLogger = logger.child({ userId: '123', sessionId: 'abc' });
userLogger.info('Profile updated');  // Automatically includes userId & sessionId
userLogger.warn('Invalid avatar format');
```

## Request Context Propagation

The logging system uses **AsyncLocalStorage** to automatically propagate request context throughout the request lifecycle. This means:

1. **Request ID** is automatically included in all logs within a request
2. **User ID** is added after authentication (via auth middleware)
3. **Trace parent** for distributed tracing is propagated
4. No need to manually pass context objects through function calls

### How it works:

```typescript
// 1. Request comes in with/without X-Request-ID header
// 2. requestContextMiddleware creates/reads request ID
// 3. Context is stored in AsyncLocalStorage
// 4. Any logger.* call automatically includes context
// 5. Auth middleware adds userId to context

// In your code (no manual context passing needed):
logger.info('Processing payment');  
// Output: { ..., requestId: "abc-123", userId: "user-456", message: "Processing payment" }
```

## Output Formats

### Development (Pretty Print)
```
[2025-10-31 14:23:45.123] INFO (user-service): Server started successfully
    service: "user-service"
    port: 3000
    environment: "development"
```

### Production (JSON)
```json
{
  "level": "info",
  "time": "2025-10-31T14:23:45.123Z",
  "service": "user-service",
  "message": "Server started successfully",
  "port": 3000,
  "environment": "production"
}
```

## HTTP Request Logging

The `httpLoggerMiddleware` automatically logs all HTTP requests:

```json
{
  "level": "info",
  "message": "GET /api/users/123 200 - 45ms",
  "requestId": "abc-123",
  "userId": "user-456",
  "method": "GET",
  "path": "/api/users/123",
  "statusCode": 200,
  "duration": 45,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

- **2xx/3xx** → `info`
- **4xx** → `warn`
- **5xx** → `error`

## Integration with Log Aggregators

The JSON output in production is designed for easy ingestion by:

- **Elasticsearch + Filebeat/Logstash**
- **Datadog**
- **CloudWatch**
- **Splunk**
- **New Relic**

Example Filebeat configuration:
```yaml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    json.keys_under_root: true
    json.add_error_key: true
```

## Testing

Mock the logger in your tests:

```typescript
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(() => mockLogger),
};

// Use in tests
container.rebind<ILogger>(TYPES.Logger).toConstantValue(mockLogger);
```

## Best Practices

1. **Use appropriate log levels**
   - Don't log everything as `info` or `error`
   - `debug` for development-only details
   - `error` only for actual errors requiring attention

2. **Include relevant context**
   ```typescript
   // Good
   logger.error('Payment failed', error, { userId, orderId, amount });
   
   // Bad
   logger.error('Error occurred');
   ```

3. **Don't log sensitive data**
   - ❌ Passwords, tokens, credit cards, PII
   - ✅ User IDs, timestamps, operation types

4. **Log at boundaries**
   - Service entry/exit points
   - External API calls
   - Database operations
   - Business-critical operations

5. **Use child loggers for scoped context**
   ```typescript
   const orderLogger = logger.child({ orderId, customerId });
   orderLogger.info('Order processing started');
   // ... multiple operations
   orderLogger.info('Order completed');
   ```

## Reusing in Other Services

To reuse this logging module in another Express service:

1. **Copy the logging directory** to your new service
2. **Install dependencies**: `npm install pino pino-pretty pino-http`
3. **Update the service name** in `PinoLoggerService` constructor or pass it as config
4. **Set up DI container** with Logger binding
5. **Add middlewares** to your Express app
6. **Inject `ILogger`** into services/controllers

Example for a new service:
```typescript
// payment-service/src/logging/pino.logger.ts
constructor(serviceName: string = 'payment-service') {  // Change service name
  this.serviceName = serviceName;
  this.logger = this.createLogger();
}
```

## Configuration

Logging behavior is controlled by `NODE_ENV`:

- `NODE_ENV=development` → Pretty console output, debug level
- `NODE_ENV=production` → JSON output, info level
- `NODE_ENV=test` → JSON output, warn level (can be customized)

No additional configuration files needed!

## Troubleshooting

**Issue**: Logs missing `requestId`
- **Solution**: Ensure `requestContextMiddleware` is registered first

**Issue**: Logs missing `userId` after auth
- **Solution**: Verify auth middleware calls `asyncContext.updateContext({ userId })`

**Issue**: Cannot read property 'requestId' of undefined
- **Solution**: Ensure middleware order: requestContext → httpLogger → routes

**Issue**: Logs not appearing
- **Solution**: Check log level. In production, `debug` logs are disabled.

## Performance

- **Pino** is one of the fastest Node.js loggers (10x faster than Winston)
- **AsyncLocalStorage** has minimal overhead (~1-2% in typical scenarios)
- **JSON serialization** is optimized by Pino
- **No performance impact** from unused log levels (they're no-ops)

## Future Enhancements

Potential additions:
- [ ] Log sampling (e.g., sample 10% of info logs at high traffic)
- [ ] Automatic PII redaction
- [ ] Custom transports (send errors to Sentry, metrics to Prometheus)
- [ ] Log rotation for local development
- [ ] Correlation with OpenTelemetry spans

