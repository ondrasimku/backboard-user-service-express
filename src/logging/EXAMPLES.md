# Logging Examples

Quick reference for common logging patterns in the user-service.

## Basic Logging

```typescript
import { ILogger } from '../logging/logger.interface';
import { inject } from 'inversify';
import { TYPES } from '../types/di.types';

@injectable()
export class MyService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  // Simple info log
  async doSomething() {
    this.logger.info('Operation started');
    // ... do work
    this.logger.info('Operation completed');
  }
}
```

## Logging with Context

```typescript
// Add custom context fields
async createOrder(userId: string, items: Item[]) {
  this.logger.info('Creating order', { 
    userId, 
    itemCount: items.length,
    totalAmount: calculateTotal(items)
  });
  
  const order = await this.orderRepository.save({ userId, items });
  
  this.logger.info('Order created successfully', {
    orderId: order.id,
    userId: order.userId
  });
  
  return order;
}
```

## Error Logging

```typescript
// Log errors with full stack trace
async processPayment(orderId: string) {
  try {
    const payment = await this.paymentGateway.charge(orderId);
    this.logger.info('Payment processed', { orderId, transactionId: payment.id });
    return payment;
  } catch (error) {
    // Logs error with full stack trace and context
    this.logger.error(
      'Payment processing failed', 
      error as Error, 
      { orderId, gateway: 'stripe' }
    );
    throw error;
  }
}
```

## Warning Logs

```typescript
// Log recoverable issues
async login(email: string, password: string) {
  const user = await this.userRepository.findByEmail(email);
  
  if (!user) {
    this.logger.warn('Login attempt with non-existent email', { email });
    throw new AppError('Invalid credentials', 401);
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    this.logger.warn('Login failed: invalid password', { 
      email, 
      userId: user.id,
      attempts: user.loginAttempts 
    });
    throw new AppError('Invalid credentials', 401);
  }
  
  this.logger.info('User logged in successfully', { userId: user.id, email });
  return user;
}
```

## Debug Logs

```typescript
// Detailed logs for development (disabled in production)
async fetchUserProfile(userId: string) {
  this.logger.debug('Fetching user profile', { userId });
  
  const cacheKey = `user:${userId}`;
  const cached = await this.cache.get(cacheKey);
  
  if (cached) {
    this.logger.debug('Cache hit for user profile', { userId, cacheKey });
    return JSON.parse(cached);
  }
  
  this.logger.debug('Cache miss, querying database', { userId });
  const user = await this.userRepository.findById(userId);
  
  await this.cache.set(cacheKey, JSON.stringify(user), 3600);
  this.logger.debug('User profile cached', { userId, ttl: 3600 });
  
  return user;
}
```

## Child Logger (Scoped Context)

```typescript
// Create a child logger with persistent context
async processOrder(orderId: string) {
  // All logs from orderLogger will include orderId
  const orderLogger = this.logger.child({ orderId });
  
  orderLogger.info('Starting order processing');
  
  try {
    orderLogger.debug('Validating order items');
    await this.validateItems(orderId);
    
    orderLogger.info('Processing payment');
    await this.processPayment(orderId);
    
    orderLogger.info('Updating inventory');
    await this.updateInventory(orderId);
    
    orderLogger.info('Order processed successfully');
  } catch (error) {
    orderLogger.error('Order processing failed', error as Error);
    throw error;
  }
}
```

## Structured Data

```typescript
// Log complex objects (they'll be serialized as JSON)
async syncExternalData(source: string) {
  const startTime = Date.now();
  
  this.logger.info('Starting data sync', { source });
  
  const result = await this.externalApi.fetchData();
  
  this.logger.info('Data sync completed', {
    source,
    duration: Date.now() - startTime,
    recordsFetched: result.records.length,
    recordsCreated: result.created,
    recordsUpdated: result.updated,
    recordsFailed: result.failed,
    summary: {
      success: result.success,
      errors: result.errors.map(e => e.message)
    }
  });
}
```

## HTTP Request/Response (Automatic)

```typescript
// No manual logging needed for HTTP - middleware handles it!
// But you can add custom logs in controllers if needed:

@injectable()
export class UserController {
  constructor(
    @inject(TYPES.UserService) private userService: IUserService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  getCurrentUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // requestId and userId are automatically included from context
      this.logger.debug('Fetching current user profile');
      
      const user = await this.userService.getUserById(req.user.userId);
      
      if (!user) {
        this.logger.warn('Current user not found in database', { 
          userId: req.user.userId 
        });
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.json(user);
    } catch (error) {
      next(error);
    }
  };
}
```

## Conditional Logging

```typescript
// Log based on conditions
async fetchWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (attempt > 1) {
        // Log successful retry
        this.logger.info('Request succeeded after retry', { url, attempt });
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        // Final attempt failed
        this.logger.error(
          'Request failed after all retries', 
          error as Error,
          { url, attempts: maxRetries }
        );
        throw error;
      } else {
        // Retry will happen
        this.logger.warn('Request failed, retrying', { 
          url, 
          attempt, 
          maxRetries,
          error: (error as Error).message 
        });
        await this.delay(1000 * attempt);
      }
    }
  }
}
```

## Performance Monitoring

```typescript
// Log operation duration
async expensiveOperation(dataId: string) {
  const startTime = Date.now();
  
  this.logger.info('Starting expensive operation', { dataId });
  
  try {
    const result = await this.processData(dataId);
    
    const duration = Date.now() - startTime;
    
    // Log performance
    if (duration > 5000) {
      this.logger.warn('Operation took longer than expected', { 
        dataId, 
        duration,
        threshold: 5000 
      });
    } else {
      this.logger.info('Operation completed', { dataId, duration });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(
      'Operation failed', 
      error as Error,
      { dataId, duration }
    );
    throw error;
  }
}
```

## External Service Calls

```typescript
// Log external API calls
async sendEmail(to: string, subject: string, body: string) {
  this.logger.info('Sending email', { to, subject });
  
  try {
    const response = await this.emailService.send({ to, subject, body });
    
    this.logger.info('Email sent successfully', {
      to,
      messageId: response.messageId,
      provider: 'sendgrid'
    });
    
    return response;
  } catch (error) {
    this.logger.error(
      'Failed to send email',
      error as Error,
      {
        to,
        subject,
        provider: 'sendgrid',
        statusCode: (error as any).statusCode
      }
    );
    throw error;
  }
}
```

## Database Operations

```typescript
// Log database queries (when needed)
async bulkUpdateUsers(updates: UserUpdate[]) {
  this.logger.info('Starting bulk user update', { count: updates.length });
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  for (const update of updates) {
    try {
      await this.userRepository.update(update.id, update.data);
      results.success++;
      
      // Only log every 100 updates to avoid log spam
      if (results.success % 100 === 0) {
        this.logger.debug('Bulk update progress', { 
          processed: results.success + results.failed,
          total: updates.length 
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`User ${update.id}: ${(error as Error).message}`);
      
      this.logger.warn('Failed to update user', { 
        userId: update.id,
        error: (error as Error).message 
      });
    }
  }
  
  this.logger.info('Bulk update completed', results);
  
  return results;
}
```

## Startup/Shutdown

```typescript
// Already implemented in server.ts, but here's the pattern:

const startServer = async () => {
  const logger = container.get<ILogger>(TYPES.Logger);
  
  logger.info('Starting service', { 
    service: 'user-service',
    environment: config.nodeEnv,
    port: config.port,
    version: process.env.APP_VERSION || 'unknown'
  });
  
  try {
    await initializeDatabase();
    logger.info('Database connection established');
    
    await connectToRabbitMQ();
    logger.info('Message broker connected');
    
    app.listen(config.port, () => {
      logger.info('Service ready to accept connections', { 
        port: config.port 
      });
    });
  } catch (error) {
    logger.error('Failed to start service', error as Error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  
  await server.close();
  logger.info('HTTP server closed');
  
  await database.close();
  logger.info('Database connections closed');
  
  logger.info('Shutdown complete');
  process.exit(0);
});
```

## Testing with Mock Logger

```typescript
// In your tests
import { ILogger } from '../logging/logger.interface';

describe('UserService', () => {
  let userService: UserService;
  let mockLogger: jest.Mocked<ILogger>;
  
  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };
    
    userService = new UserService(mockUserRepository, mockLogger);
  });
  
  it('should log when user is created', async () => {
    await userService.createUser({ email: 'test@example.com' });
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      'User created successfully',
      expect.objectContaining({ 
        email: 'test@example.com' 
      })
    );
  });
  
  it('should log error when creation fails', async () => {
    mockUserRepository.save.mockRejectedValue(new Error('DB error'));
    
    await expect(
      userService.createUser({ email: 'test@example.com' })
    ).rejects.toThrow();
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to create user',
      expect.any(Error),
      expect.objectContaining({ 
        email: 'test@example.com' 
      })
    );
  });
});
```

## Anti-Patterns (What NOT to Do)

```typescript
// ❌ DON'T: Log sensitive data
this.logger.info('User registered', { 
  password: user.password,  // NEVER log passwords
  ssn: user.ssn,           // NEVER log PII
  creditCard: user.cc      // NEVER log payment info
});

// ✅ DO: Log safe identifiers only
this.logger.info('User registered', { 
  userId: user.id,
  email: user.email 
});

// ❌ DON'T: Log everything
this.logger.info('Function started');
this.logger.info('Parsing data');
this.logger.info('Data parsed');
this.logger.info('Validating data');
this.logger.info('Data validated');
// ... too much noise

// ✅ DO: Log meaningful operations
this.logger.info('Processing user data', { userId, operation: 'validation' });
// ... do all the work
this.logger.info('User data processed successfully', { userId });

// ❌ DON'T: Use wrong log levels
this.logger.error('User not found');  // Not an error, expected case
this.logger.info('Database connection failed');  // Should be error

// ✅ DO: Use appropriate levels
this.logger.warn('User not found', { userId });  // Expected but notable
this.logger.error('Database connection failed', error);  // Actual error

// ❌ DON'T: Manually pass requestId everywhere
async function doSomething(data: any, requestId: string) {
  logger.info('Doing something', { data, requestId });
  await helper(data, requestId);  // Pollutes signatures
}

// ✅ DO: Let AsyncLocalStorage handle it
async function doSomething(data: any) {
  logger.info('Doing something', { data });  // requestId auto-included
  await helper(data);  // Clean signature
}
```

## Best Practices Summary

1. **Use appropriate log levels**: debug < info < warn < error
2. **Include relevant context**: userId, orderId, operation type, etc.
3. **Log at boundaries**: Service entry/exit, external calls, DB operations
4. **Don't log sensitive data**: Passwords, tokens, PII, credit cards
5. **Use child loggers for scoped context**: When multiple operations share context
6. **Log errors with full context**: Include error object + relevant data
7. **Avoid log spam**: Don't log inside tight loops
8. **Performance awareness**: Log durations for slow operations
9. **Structured data**: Use objects instead of string concatenation
10. **Let middleware handle HTTP logs**: Don't duplicate request/response logging

