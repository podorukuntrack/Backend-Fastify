# API Architecture & Module Overview

Visualisasi lengkap struktur API dan relasi antar module.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                        │
│  src/pages, src/components, src/hooks, src/context                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            HTTP/JSON    Fetch API      Authorization
                                │
┌───────────────────────────────┴──────────────────────────────────────┐
│                    FASTIFY SERVER (Node.js)                          │
│              http://localhost:3000/api/v1                            │
├───────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    MIDDLEWARE LAYER                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │ authenticate │  │  authorize   │  │    validate (Zod)    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    MODULES (17+)                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │ Auth       Users      Companies    Projects    Units   │  │ │
│  │  │ Dashboard  Tickets    Assignments  Payments   Progress│  │ │
│  │  │ Handovers  Retentions Timelines    Clusters   Docs   │  │ │
│  │  │ Analytics  WhatsApp                                   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                   BUSINESS LOGIC LAYER                         │ │
│  │  Services, Controllers, Repositories (per module)             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      PLUGINS                                   │ │
│  │  ┌────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────────┐  │ │
│  │  │ Auth   │  │ Database│  │Multipart │  │  Swagger UI     │  │ │
│  │  └────────┘  └─────────┘  └──────────┘  └─────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────┬────────────────────────────┘
                 │                        │
                 ▼                        ▼
        ┌─────────────────┐     ┌──────────────────────┐
        │  PostgreSQL     │     │   Cloudflare R2      │
        │  (Neon)         │     │   (File Storage)     │
        └─────────────────┘     └──────────────────────┘
```

---

## Module Dependency Graph

```
                           ┌─────────────┐
                           │    AUTH     │ (Login, Token)
                           └──────┬──────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼──────┐           ┌────────▼─────┐
              │   USERS    │           │  COMPANIES   │
              │ (Admin)    │           │ (Super Admin)│
              └─────┬──────┘           └────────┬─────┘
                    │                           │
        ┌───────────┼──────────────────────────┼──────────┐
        │           │                          │          │
   ┌────▼─────┐┌────▼───────┐┌────────────┐┌──▼────────┐ │
   │ PROJECTS ││  CLUSTERS  ││  DASHBOARD ││ANALYTICS ││ │
   └────┬─────┘└────┬───────┘└──────┬─────┘└──────┬───┘ │
        │           │               │              │    │
   ┌────▼─────┐┌────▼───────┐  ┌────▼─────┐ ┌────▼──┐  │
   │  UNITS   ││ TIMELINES  │  │ PAYMENTS │ │TICKETS│  │
   └────┬─────┘└────────────┘  └────┬─────┘ └────┬──┘  │
        │                            │            │    │
   ┌────▼────────────────┐  ┌────────▼────┐  ┌──▼──┐  │
   │  ASSIGNMENTS        │  │DOCUMENTATION│  │NOTES│  │
   └────┬────────────────┘  └─────────────┘  └─────┘  │
        │                                              │
   ┌────▼─────────┐                    ┌──────────┐    │
   │  HANDOVERS   │                    │RETENTIONS│    │
   └──────────────┘                    └──────────┘    │
        │                                              │
   ┌────▼────────────────┐                            │
   │  WHATSAPP          │                            │
   │  (Notifications)   │                            │
   └────────────────────┘                            │
                                                     │
                                         ┌───────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  PostgreSQL         │
                              │  Drizzle ORM        │
                              └─────────────────────┘
```

---

## Module Structure (MVC Pattern)

```
module/
├── {module}.controller.js    # Handle HTTP requests
├── {module}.service.js       # Business logic
├── {module}.repository.js    # Database queries
├── {module}.routes.js        # Define endpoints
└── {module}.schema.js        # Input validation (Zod)
```

### Example: Users Module

```
users/
├── user.controller.js
│   ├── getAllHandler()
│   ├── getByIdHandler()
│   ├── createHandler()
│   ├── updateHandler()
│   └── deleteHandler()
│
├── user.service.js
│   ├── getAllUsers()
│   ├── getUserById()
│   ├── createUser()
│   ├── updateUser()
│   └── deleteUser()
│
├── user.repository.js
│   ├── findAll()
│   ├── findById()
│   ├── insert()
│   ├── update()
│   └── delete()
│
├── user.routes.js
│   ├── GET /users
│   ├── POST /users
│   ├── GET /users/:id
│   ├── PATCH /users/:id
│   └── DELETE /users/:id
│
└── user.schema.js
    ├── createUserSchema
    ├── updateUserSchema
    └── userIdParamSchema
```

---

## Authentication & Authorization Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ User Input Credentials                                       │
│         │                                                     │
│         ▼                                                     │
│ POST /auth/login                                             │
│    { email, password }                                       │
│         │                                                     │
│         ▼                                                     │
│ ┌─────────────────────────────────────────┐                 │
│ │ Backend Validation & Hash Check        │                 │
│ │ - Validate input format                │                 │
│ │ - Find user by email                   │                 │
│ │ - Compare password with bcrypt         │                 │
│ └────────────┬────────────────────────────┘                 │
│              │                                               │
│    ┌─────────┴──────────┐                                   │
│    │                    │                                   │
│  Valid              Invalid                                 │
│    │                    │                                   │
│    ▼                    ▼                                   │
│ ┌──────────────┐   Return 401                              │
│ │Generate JWT  │   Unauthorized                            │
│ │- accessToken │                                           │
│ │- refreshToken│                                           │
│ └──────┬───────┘                                           │
│        │                                                    │
│        ▼                                                    │
│ Response: {                                                │
│   accessToken,  // Valid 15 minutes                       │
│   refreshToken, // Valid 7 days                           │
│   user: {...}                                             │
│ }                                                          │
│        │                                                    │
│        ▼                                                    │
│ Frontend: Save to localStorage                            │
│                                                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              AUTHORIZATION FLOW (Per Request)               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Frontend Request with Token                                  │
│ GET /users                                                   │
│ Header: Authorization: Bearer <accessToken>                │
│         │                                                     │
│         ▼                                                     │
│ ┌─────────────────────────────────────────┐                 │
│ │ fastify.authenticate (Middleware 1)    │                 │
│ │ - Verify JWT signature                 │                 │
│ │ - Check token expiration               │                 │
│ │ - Extract user info from token         │                 │
│ │ - Inject user object to request        │                 │
│ └────────────┬────────────────────────────┘                 │
│              │                                               │
│    ┌─────────┴──────────┐                                   │
│    │                    │                                   │
│  Valid              Expired/Invalid                         │
│    │                    │                                   │
│    ▼                    ▼                                   │
│ Continue        Return 401 Unauthorized                    │
│    │                   Frontend: Use                        │
│    │                   refreshToken to get                 │
│    │                   new accessToken                     │
│    ▼                                                        │
│ ┌─────────────────────────────────────────┐                 │
│ │ authorize (Middleware 2)                │                 │
│ │ - Check user.role                      │                 │
│ │ - Verify required roles                │                 │
│ │ - Allow or deny access                 │                 │
│ └────────────┬────────────────────────────┘                 │
│              │                                               │
│    ┌─────────┴──────────┐                                   │
│    │                    │                                   │
│  Allowed           Forbidden                               │
│    │                    │                                   │
│    ▼                    ▼                                   │
│ Continue        Return 403 Forbidden                       │
│    │                   User doesn't have                   │
│    │                   required role                       │
│    ▼                                                        │
│ ┌─────────────────────────────────────────┐                 │
│ │ validate (Middleware 3)                 │                 │
│ │ - Validate body/params with Zod        │                 │
│ │ - Check required fields                │                 │
│ │ - Validate data types & formats        │                 │
│ └────────────┬────────────────────────────┘                 │
│              │                                               │
│    ┌─────────┴──────────┐                                   │
│    │                    │                                   │
│  Valid              Invalid                                │
│    │                    │                                   │
│    ▼                    ▼                                   │
│ Continue        Return 400 Bad Request                     │
│    │                   With validation errors             │
│    ▼                                                        │
│ Execute Handler (Controller)                               │
│    │                                                        │
│    ▼                                                        │
│ Return Response                                             │
│                                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Request/Response Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│                 COMPLETE REQUEST FLOW                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. FRONTEND INITIATES REQUEST                             │
│    const data = await apiClient('/users/123', {           │
│      method: 'PATCH',                                     │
│      body: JSON.stringify({ name: 'New Name' })          │
│    });                                                     │
│                                                             │
│ 2. API CLIENT PREPARES REQUEST                            │
│    - Read accessToken dari localStorage                   │
│    - Add Authorization header                             │
│    - Add Content-Type: application/json                   │
│                                                             │
│ 3. SEND HTTP REQUEST                                      │
│    PATCH http://localhost:3000/api/v1/users/123           │
│    Headers:                                               │
│      Authorization: Bearer eyJhbGc...                     │
│      Content-Type: application/json                       │
│    Body:                                                  │
│      { "name": "New Name" }                               │
│                                                             │
│ 4. BACKEND RECEIVES REQUEST                               │
│    ▼                                                       │
│ 5. MIDDLEWARE CHAIN EXECUTES                              │
│    a) fastify.authenticate                                │
│       - Verify JWT token valid                            │
│       - Extract user: request.user = { id, role, ... }   │
│                                                             │
│    b) authorize('super_admin', 'admin')                   │
│       - Check if request.user.role in allowed roles       │
│       - If not, return 403 Forbidden                      │
│                                                             │
│    c) validate(updateUserSchema)                          │
│       - Validate params: { id: uuid }                     │
│       - Validate body: { name: string }                   │
│       - If invalid, return 400 with errors                │
│                                                             │
│ 6. HANDLER EXECUTES (CONTROLLER)                          │
│    updateHandler(request, reply) {                        │
│      - Extract data from request                          │
│      - Call service method                                │
│      - Handle errors                                      │
│      - Send response                                      │
│    }                                                       │
│                                                             │
│ 7. SERVICE EXECUTES (BUSINESS LOGIC)                      │
│    updateUser(id, data) {                                 │
│      - Validate business rules                            │
│      - Call repository                                    │
│      - Transform data if needed                           │
│      - Return result                                      │
│    }                                                       │
│                                                             │
│ 8. REPOSITORY EXECUTES (DATABASE)                         │
│    update(id, data) {                                     │
│      - Build SQL/ORM query                                │
│      - Execute on PostgreSQL                              │
│      - Return updated record                              │
│    }                                                       │
│                                                             │
│ 9. RESPONSE ASSEMBLED                                     │
│    return reply.code(200).send({                          │
│      success: true,                                       │
│      message: 'User updated',                             │
│      data: { id: '123', name: 'New Name', ... }          │
│    });                                                     │
│                                                             │
│ 10. BACKEND SENDS HTTP RESPONSE                           │
│     HTTP 200 OK                                           │
│     Content-Type: application/json                        │
│     Body:                                                 │
│       {                                                   │
│         "success": true,                                  │
│         "message": "User updated",                        │
│         "data": { "id": "123", "name": "New Name" }      │
│       }                                                    │
│                                                             │
│ 11. FRONTEND RECEIVES RESPONSE                            │
│     const result = await apiClient(...);                  │
│     // result = { id: '123', name: 'New Name' }          │
│                                                             │
│ 12. FRONTEND UPDATES STATE                                │
│     setUser(result);                                      │
│     // UI updates with new data                           │
│                                                             │
│ 13. USER SEES UPDATED DATA                                │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Data Flow for Real Example: Create User

```
┌──────────────────────────────────────────────────────────┐
│             CREATE USER (POST /users)                    │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ FRONTEND (React Component)                               │
│ ─────────────────────────────────────────                │
│                                                            │
│ const [email, setEmail] = useState('');                 │
│ const [password, setPassword] = useState('');           │
│                                                            │
│ const handleSubmit = async (e) => {                      │
│   const result = await apiClient('/users', {            │
│     method: 'POST',                                     │
│     body: JSON.stringify({                              │
│       email: 'newuser@example.com',                     │
│       password: 'password123',                          │
│       name: 'John Doe',                                 │
│       role: 'admin'                                     │
│     })                                                   │
│   });                                                    │
│   setUsers([...users, result]);                         │
│ };                                                       │
│                                                            │
│                      ▼                                    │
│                                                            │
│ BACKEND (user.routes.js)                                │
│ ──────────────────────────────                          │
│                                                            │
│ POST /users with validation middleware                  │
│   ├─ authenticate: ✅ User logged in                    │
│   ├─ authorize('super_admin', 'admin'): ✅ User is admin│
│   └─ validate(createUserSchema): ✅ Data valid          │
│                                                            │
│                      ▼                                    │
│                                                            │
│ BACKEND (user.controller.js)                            │
│ ────────────────────────────────                        │
│                                                            │
│ createHandler(request, reply) {                          │
│   const { email, password, name, role } = request.body; │
│   const result = await service.createUser(...);         │
│   return reply.code(201).send({                         │
│     success: true,                                      │
│     message: 'User created',                            │
│     data: result                                        │
│   });                                                   │
│ }                                                        │
│                                                            │
│                      ▼                                    │
│                                                            │
│ BACKEND (user.service.js)                               │
│ ────────────────────────────                            │
│                                                            │
│ async createUser(email, password, name, role) {         │
│   // Hash password with bcrypt                          │
│   const hashedPassword = await bcrypt.hash(pass, 10);   │
│                                                            │
│   // Call repository                                    │
│   const newUser = await repo.insert({                   │
│     email,                                              │
│     hashedPassword,                                     │
│     name,                                               │
│     role                                                │
│   });                                                    │
│                                                            │
│   return newUser;                                        │
│ }                                                        │
│                                                            │
│                      ▼                                    │
│                                                            │
│ BACKEND (user.repository.js)                            │
│ ────────────────────────────                            │
│                                                            │
│ async insert(userData) {                                │
│   // Use Drizzle ORM to insert into PostgreSQL          │
│   const [newUser] = await db                            │
│     .insert(usersTable)                                 │
│     .values(userData)                                   │
│     .returning();                                       │
│                                                            │
│   return newUser;                                        │
│ }                                                        │
│                                                            │
│                      ▼                                    │
│                                                            │
│ DATABASE (PostgreSQL)                                   │
│ ───────────────────                                     │
│                                                            │
│ INSERT INTO users (                                     │
│   id, email, password, name, role, created_at          │
│ ) VALUES (                                              │
│   'uuid', 'new@example.com', 'hashed...', 'John', ...  │
│ ) RETURNING *;                                          │
│                                                            │
│                      ▼                                    │
│                                                            │
│ RESPONSE TRAVELS BACK UP THE STACK                      │
│                                                            │
│ Repository → Service → Controller → Response            │
│                                                            │
│                      ▼                                    │
│                                                            │
│ HTTP 201 CREATED Response                               │
│ ────────────────────────────────                        │
│ {                                                        │
│   "success": true,                                      │
│   "message": "User created",                            │
│   "data": {                                             │
│     "id": "550e8400-e29b-41d4-a716-446655440000",      │
│     "email": "new@example.com",                         │
│     "name": "John Doe",                                 │
│     "role": "admin",                                    │
│     "companyId": "uuid",                                │
│     "createdAt": "2024-01-15T10:30:00Z"                │
│   }                                                      │
│ }                                                        │
│                                                            │
│                      ▼                                    │
│                                                            │
│ FRONTEND UPDATES STATE                                  │
│ ────────────────────────                                │
│                                                            │
│ const result = await apiClient(...);                    │
│ // result = { id: '...', email: '...', ... }           │
│ setUsers([...users, result]);                           │
│ showSuccessMessage('User created successfully!');       │
│                                                            │
│                      ▼                                    │
│                                                            │
│ UI UPDATES & SHOWS NEW USER IN LIST                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────┐
│              ERROR HANDLING SCENARIOS                    │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ SCENARIO 1: Invalid Token                               │
│ ─────────────────────────                               │
│ Request → Backend → Verify JWT → INVALID                │
│                                   ↓                      │
│                     Return 401 Unauthorized             │
│                                   ↓                      │
│ Frontend → Check status 401       │                     │
│         → Try to refresh token    │                     │
│         → If refresh fails → Redirect to /login         │
│                                                            │
│ SCENARIO 2: No Permission                               │
│ ───────────────────────                                 │
│ Request (role: customer) → GET /users                   │
│                  ↓                                       │
│           authorize('admin') check                      │
│                  ↓                                       │
│     Return 403 Forbidden                                │
│                  ↓                                       │
│ Frontend → Show error message                           │
│         "You don't have permission"                     │
│                                                            │
│ SCENARIO 3: Bad Request Data                            │
│ ───────────────────────────                             │
│ Request { email: 'invalid' } → Backend                  │
│                  ↓                                       │
│           Validate with Zod schema                      │
│                  ↓                                       │
│     Return 400 Bad Request + Validation Errors          │
│     {                                                   │
│       \"success\": false,                               │
│       \"message\": \"Validation failed\",               │
│       \"errors\": [                                     │
│         { \"path\": \"email\", \"message\": \"...\" }   │
│       ]                                                 │
│     }                                                    │
│                  ↓                                       │
│ Frontend → Parse errors → Show in form                  │
│                                                            │
│ SCENARIO 4: Server Error                                │
│ ────────────────────────                                │
│ Request → Processing → Unexpected Error                │
│                  ↓                                       │
│           Global Error Handler                          │
│                  ↓                                       │
│     Return 500 Internal Server Error                    │
│                  ↓                                       │
│ Frontend → Log error → Show generic message             │
│         \"Something went wrong, try again later\"       │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
┌─────────────────────────────────────────┐
│           TECHNOLOGY STACK              │
├─────────────────────────────────────────┤
│                                          │
│ FRONTEND                                │
│ ├─ React 18+                            │
│ ├─ Vite (Build tool)                    │
│ ├─ React Router (Routing)               │
│ ├─ Tailwind CSS (Styling)               │
│ └─ Fetch API (HTTP client)              │
│                                          │
│ BACKEND                                 │
│ ├─ Fastify 5.8.5 (Web framework)       │
│ ├─ Node.js (Runtime)                    │
│ ├─ Drizzle ORM (Database ORM)           │
│ ├─ Zod (Validation)                     │
│ ├─ JWT (Authentication)                 │
│ ├─ Bcrypt (Password hashing)            │
│ └─ Multipart (File upload)              │
│                                          │
│ DATABASE                                │
│ ├─ PostgreSQL 15+                       │
│ ├─ Neon (Cloud DB)                      │
│ └─ Drizzle Migrations                   │
│                                          │
│ CLOUD SERVICES                          │
│ ├─ Cloudflare R2 (File storage)         │
│ └─ Environment variables (.env)         │
│                                          │
│ TOOLS                                   │
│ ├─ Postman (API testing)                │
│ ├─ VS Code (Code editor)                │
│ └─ Git (Version control)                │
│                                          │
└─────────────────────────────────────────┘
```

---

## Database Schema Overview

```
┌────────────────────────────────────────────────┐
│          MAIN TABLES & RELATIONSHIPS           │
├────────────────────────────────────────────────┤
│                                                 │
│ companies                                      │
│ ├─ id (uuid, PK)                              │
│ ├─ name (string)                              │
│ └─ createdAt, updatedAt                       │
│   │                                            │
│   └──► 1:N ──► users                          │
│               ├─ id (uuid, PK)                │
│               ├─ email (string, unique)       │
│               ├─ password (hashed)            │
│               ├─ name                         │
│               ├─ role (enum)                  │
│               ├─ companyId (FK)               │
│               └─ createdAt, updatedAt         │
│                                                │
│   └──► 1:N ──► projects                       │
│               ├─ id (uuid, PK)                │
│               ├─ name                         │
│               ├─ description                  │
│               ├─ companyId (FK)               │
│               └─ status                       │
│                 │                              │
│                 └──► 1:N ──► units            │
│                             ├─ id (uuid, PK) │
│                             ├─ unitCode      │
│                             ├─ projectId (FK)│
│                             ├─ price         │
│                             ├─ status        │
│                             └─ details       │
│                               │               │
│                               └──► 1:1 ──► assignments │
│                                   ├─ customerId (FK)   │
│                                   └─ status            │
│                                     │                  │
│                                     └──► 1:N ──► payments │
│                                              ├─ amount  │
│                                              └─ status  │
│                                                         │
│                                                         │
│ tickets                                                 │
│ ├─ id (uuid, PK)                                       │
│ ├─ title, description                                  │
│ ├─ createdBy (FK to users)                            │
│ ├─ assignedTo (FK to users)                           │
│ ├─ status, priority                                    │
│ └─ companyId (FK)                                      │
│                                                        │
│ progress                                               │
│ ├─ id (uuid, PK)                                       │
│ ├─ projectId (FK)                                      │
│ ├─ percentage                                          │
│ └─ description                                         │
│                                                        │
│ documentation                                          │
│ ├─ id (uuid, PK)                                       │
│ ├─ projectId (FK)                                      │
│ ├─ type (contract, permit, etc)                        │
│ ├─ fileUrl (Cloudflare R2)                            │
│ └─ uploadedBy (FK to users)                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Key Points Summary

```
┌─────────────────────────────────────────────────┐
│              KEY ARCHITECTURE POINTS            │
├─────────────────────────────────────────────────┤
│                                                  │
│ 1. FRONTEND → BACKEND Communication            │
│    • HTTP/JSON via Fetch API                   │
│    • Authorization header + JWT token          │
│    • Standardized response format              │
│                                                  │
│ 2. Authentication                              │
│    • Login returns accessToken (15 min)        │
│    • and refreshToken (7 days)                 │
│    • Auto-refresh on 401 response              │
│                                                  │
│ 3. Authorization                               │
│    • Role-based access control                 │
│    • 4 roles: super_admin, admin,              │
│              customer_service, customer        │
│    • Permission matrix per endpoint            │
│                                                  │
│ 4. Middleware Pipeline                         │
│    • authenticate → authorize → validate       │
│    • Each middleware can reject request        │
│    • Error at any stage = fail entire flow     │
│                                                  │
│ 5. Module Pattern                              │
│    • Routes → Controller → Service → Repo      │
│    • Separation of concerns                    │
│    • Easy to test & maintain                   │
│                                                  │
│ 6. Data Validation                             │
│    • Zod on backend for all inputs             │
│    • Frontend should validate too              │
│    • Return 400 with detailed errors           │
│                                                  │
│ 7. Error Handling                              │
│    • Try-catch in all async functions          │
│    • Global error handler in Fastify           │
│    • Consistent error response format          │
│                                                  │
│ 8. Database Access                             │
│    • Drizzle ORM (type-safe)                   │
│    • PostgreSQL (via Neon)                     │
│    • Migrations for schema changes             │
│                                                  │
│ 9. File Storage                                │
│    • Cloudflare R2 for files                   │
│    • Multipart/form-data for uploads           │
│    • Public URL returned after upload          │
│                                                  │
│ 10. Monitoring & Logging                       │
│     • Backend logs requests                    │
│     • Browser DevTools for frontend            │
│     • Check Swagger UI at /documentation       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

**Use this diagram as reference when:**
- Understanding API flow
- Debugging issues
- Planning new features
- Explaining to team members
- Onboarding new developers

Happy building! 🚀
