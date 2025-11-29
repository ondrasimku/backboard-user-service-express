# User Service - Identity Provider (IdP)

A TypeScript Express.js microservice that acts as the Identity Provider (IdP) for the Backboard platform. Provides user management, authentication, role-based authorization, and JWT token issuance.

## Features

- ✅ User registration with email/password
- ✅ User login with JWT token generation
- ✅ RSA-256 JWT authentication (asymmetric keys)
- ✅ **JWKS endpoint** for public key discovery
- ✅ **Role-based permission system** with centralized management
- ✅ **Multi-tenant support** with organization isolation
- ✅ Password hashing with bcrypt
- ✅ Google OAuth integration
- ✅ PostgreSQL database with TypeORM
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
├── models/          # TypeORM models
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
JWT_EXPIRES_IN=1h
JWT_ISSUER=http://user-service:3000
JWT_AUDIENCE=backboard
USER_SERVICE_BASE_URL=http://user-service:3000

# Admin Permissions (legacy, now managed via roles)
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
  "sub": "user-uuid",
  "iss": "http://user-service:3000",
  "aud": "backboard",
  "iat": 1698609600,
  "exp": 1698613200,
  "nbf": 1698609600,
  "org_id": "org-uuid",
  "roles": ["org_admin", "analyst"],
  "permissions": ["users:read", "files:upload", "projects:create"],
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Security
- **Algorithm**: RS256 (RSA with SHA-256)
- **Private Key**: Signs tokens (keep secret!)
- **Public Key**: Verifies tokens (exposed via JWKS endpoint)
- **Expiration**: 1 hour (configurable via `JWT_EXPIRES_IN`)
- **JWKS Endpoint**: `/.well-known/jwks.json` for public key discovery

## Permission-Based Authorization

The service implements a centralized role and permission management system. Permissions are resolved from user roles and included in JWT tokens.

### Available Permissions

- `users:read`, `users:invite`, `users:update`, `users:delete`
- `files:read`, `files:upload`, `files:delete`
- `projects:read`, `projects:create`, `projects:update`, `projects:delete`
- `pipelines:execute`
- `permissions:manage`, `roles:manage`, `users:manage`

### Setting Up Roles and Permissions

1. **Permissions are automatically created** on service startup from `src/config/permissions.ts`

2. **Create a role:**
```bash
POST /api/admin/roles
{
  "name": "org_admin",
  "description": "Organization Administrator"
}
```

3. **Add permissions to role:**
```bash
POST /api/admin/roles/{roleId}/permissions
{
  "permissionId": "{permissionId}"
}
```

4. **Assign role to user:**
```bash
POST /api/admin/users/{userId}/roles
{
  "roleId": "{roleId}"
}
```

5. **User must login again** to receive a new token with updated roles and permissions

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
- TypeORM models defining database schema
- Contains User, Role, Permission models with relationships

### DTOs (`src/dto/`)
- Data Transfer Objects for request/response validation
- Type-safe interfaces for registration, login, and user data

### Repositories (`src/repositories/`)
- Data access layer
- Database operations (CRUD)
- Abstraction over TypeORM
- Supports tenant isolation via orgId filtering

### Services (`src/services/`)
- **AuthService**: Registration, login, JWT generation, password hashing
- **UserService**: User lookup and management
- **UserAuthService**: Resolves user roles and permissions for JWT tokens
- **RoleService**: Role management (CRUD, permission assignment)
- **PermissionService**: Permission management and synchronization

### Controllers (`src/controllers/`)
- **AuthController**: Auth endpoints (register, login, password reset)
- **UserController**: User endpoints (me, list, get by ID)
- **RoleController**: Role management endpoints
- **PermissionController**: Permission listing endpoints
- **JwksController**: JWKS endpoint for public key discovery

### Middlewares (`src/middlewares/`)
- `auth.ts`: JWT verification, AuthContext extraction, permission checking
- `errorHandler.ts`: Global error handling

### Config (`src/config/`)
- Environment configuration
- Database connection
- Dependency injection container (Inversify)
- Permission definitions (`permissions.ts`)

## License

MIT
