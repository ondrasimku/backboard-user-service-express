# User Service with JWT Authentication

A TypeScript Express.js microservice for user management with classic JWT authentication using RSA asymmetric keys.

## Features

- ✅ User registration with email/password
- ✅ User login with JWT token generation
- ✅ RSA-256 JWT authentication (asymmetric keys)
- ✅ Password hashing with bcrypt
- ✅ Permission-based authorization
- ✅ PostgreSQL database with Sequelize ORM
- ✅ Clean Architecture with Dependency Injection (Inversify)
- ✅ TypeScript with strict mode

## Architecture

This service follows **Clean Architecture** principles:

```
src/
├── config/          # Database and app configuration
├── controllers/     # HTTP request handlers
├── dto/             # Data transfer objects
├── middlewares/     # Auth, permissions, and error handling
├── models/          # Sequelize models
├── repositories/    # Data access layer
├── routes/          # Route definitions
├── services/        # Business logic layer
└── types/           # Dependency injection types
```

### Data Flow
```
Request → Middleware (Auth) → Controller → Service → Repository → Model
```

## Prerequisites

- Node.js 20+
- PostgreSQL
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate RSA Keys

```bash
node scripts/generate-keys.js
```

This will generate:
- `keys/private.pem` - For signing JWTs
- `keys/public.pem` - For verifying JWTs

The script will output the keys in environment variable format.

### 3. Environment Configuration

Create a `.env` file (copy from `.env.example`):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=backboard-postgres
DB_PORT=5432
DB_NAME=backboard-user-service
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
# Paste the keys from the generate-keys.js output
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
JWT_EXPIRES_IN=7d

# Admin Permissions
ADMIN_PERMISSIONS=read:users,write:users
```

### 4. Database Setup

Ensure PostgreSQL is running. The application will automatically create the necessary tables on startup.

### 5. Run the Application

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "permissions": [],
    ...
  },
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as registration

### User Endpoints (Authenticated)

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <jwt-token>
```

Returns the current user's profile.

#### Get All Users (Admin)
```http
GET /api/users
Authorization: Bearer <jwt-token-with-read:users-permission>
```

#### Get User by ID (Admin)
```http
GET /api/users/:id
Authorization: Bearer <jwt-token-with-read:users-permission>
```

## Authentication Flow

1. **User registers** via `POST /api/auth/register`
2. **Service** hashes password with bcrypt (10 salt rounds)
3. **Service** creates user in database
4. **Service** generates JWT signed with RSA private key
5. **Service** returns user data + JWT token
6. **Client** includes JWT in Authorization header for subsequent requests
7. **Service** verifies JWT using RSA public key
8. **Service** extracts userId from JWT and processes request

## Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,        -- bcrypt hashed
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  organization_id UUID,
  role VARCHAR DEFAULT 'user',
  permissions VARCHAR[],
  feature_flags JSONB DEFAULT '{}',
  quotas JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Field Descriptions

- **email, password, firstName, lastName**: Core authentication fields
- **organizationId**: User's organization (for multi-tenancy)
- **role**: User's role within the organization
- **permissions**: Array of permission strings for fine-grained authorization
- **featureFlags**: Feature toggles specific to this user
- **quotas**: Usage limits and quotas
- **preferences**: User preferences (e.g., theme, language)
- **metadata**: Additional app-specific data

## JWT Structure

### Token Payload
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "permissions": ["read:users", "write:users"],
  "iat": 1698609600,
  "exp": 1699214400
}
```

### Security
- **Algorithm**: RS256 (RSA with SHA-256)
- **Private Key**: Signs tokens (keep secret!)
- **Public Key**: Verifies tokens (can be shared)
- **Expiration**: 7 days (configurable via `JWT_EXPIRES_IN`)

## Permission-Based Authorization

Admin endpoints require specific permissions in the JWT token:
- `read:users` - Required to list users or get user by ID
- `write:users` - Required for future write operations

To assign permissions to a user:
1. Update the `permissions` column in the database
2. User must login again to get a new token with updated permissions

Example:
```sql
UPDATE users 
SET permissions = ARRAY['read:users', 'write:users'] 
WHERE email = 'admin@example.com';
```

## Development

### Type Checking
```bash
npm run lint
```

### Build
```bash
npm run build
```

### Testing
```bash
npm test
```

## Security Best Practices

1. **Never commit private keys** - The `keys/` directory is gitignored
2. **Use strong passwords** - Implement password strength validation
3. **Rotate keys periodically** - Generate new RSA keys and update environment
4. **Use HTTPS in production** - Always encrypt traffic
5. **Set appropriate token expiration** - Balance security vs UX
6. **Validate input** - Always sanitize and validate user input

## Project Structure

### Models (`src/models/`)
- Sequelize models defining database schema
- Contains user model with authentication and app-specific fields

### DTOs (`src/dto/`)
- Data Transfer Objects for request/response validation
- Type-safe interfaces for registration, login, and user data

### Repositories (`src/repositories/`)
- Data access layer
- Database operations (CRUD)
- Abstraction over Sequelize

### Services (`src/services/`)
- **AuthService**: Registration, login, JWT generation, password hashing
- **UserService**: User lookup and management

### Controllers (`src/controllers/`)
- **AuthController**: Auth endpoints (register, login)
- **UserController**: User endpoints (me, list, get by ID)

### Middlewares (`src/middlewares/`)
- `auth.ts`: JWT verification, permission checking
- `errorHandler.ts`: Global error handling

### Config (`src/config/`)
- Environment configuration
- Database connection
- Dependency injection container (Inversify)

## License

MIT
