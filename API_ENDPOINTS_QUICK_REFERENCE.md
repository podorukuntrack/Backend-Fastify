# QUICK REFERENCE - API Endpoints

Referensi cepat semua endpoint backend PodoRukunTrack

## Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login | ❌ |
| POST | `/auth/refresh` | Refresh token | ❌ |
| POST | `/auth/logout` | Logout | ❌ |
| GET | `/auth/me` | Current user | ✅ |

## Companies Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/companies` | List all | ✅ | super_admin |
| POST | `/companies` | Create | ✅ | super_admin |
| GET | `/companies/:id` | Get one | ✅ | super_admin |
| PATCH | `/companies/:id` | Update | ✅ | super_admin |
| DELETE | `/companies/:id` | Delete | ✅ | super_admin |

## Users Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/users` | List all | ✅ | super_admin, admin |
| POST | `/users` | Create | ✅ | super_admin, admin |
| GET | `/users/:id` | Get one | ✅ | super_admin, admin |
| PATCH | `/users/:id` | Update | ✅ | super_admin, admin |
| DELETE | `/users/:id` | Delete | ✅ | super_admin, admin |

## Projects Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/projects` | List all | ✅ | super_admin, admin |
| POST | `/projects` | Create | ✅ | super_admin, admin |
| GET | `/projects/:id` | Get one | ✅ | super_admin, admin |
| PATCH | `/projects/:id` | Update | ✅ | super_admin, admin |
| GET | `/projects/:id/stats` | Get stats | ✅ | super_admin, admin |
| DELETE | `/projects/:id` | Delete | ✅ | super_admin, admin |

## Units Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/units` | List all | ✅ | super_admin, admin |
| POST | `/units` | Create | ✅ | super_admin, admin |
| GET | `/units/:id` | Get one | ✅ | super_admin, admin |
| PATCH | `/units/:id` | Update | ✅ | super_admin, admin |
| DELETE | `/units/:id` | Delete | ✅ | super_admin, admin |

## Assignments Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/assignments` | List all | ✅ | super_admin, admin |
| POST | `/assignments` | Create | ✅ | super_admin, admin |
| GET | `/assignments/:id` | Get one | ✅ | super_admin, admin |
| PATCH | `/assignments/:id` | Update | ✅ | super_admin, admin |

## Payments Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/payments` | List all | ✅ | super_admin, admin |
| POST | `/payments` | Create | ✅ | super_admin, admin |
| GET | `/payments/:id` | Get one | ✅ | super_admin, admin |
| PATCH | `/payments/:id` | Update | ✅ | super_admin, admin |

## Tickets Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/tickets` | List all | ✅ | super_admin, admin, customer_service |
| POST | `/tickets` | Create | ✅ | all users |
| GET | `/tickets/:id` | Get one | ✅ | super_admin, admin, customer_service |
| PATCH | `/tickets/:id` | Update | ✅ | super_admin, admin, customer_service |

## Progress Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/progress` | List all | ✅ | super_admin, admin |
| POST | `/progress` | Create | ✅ | super_admin, admin |
| PATCH | `/progress/:id` | Update | ✅ | super_admin, admin |

## Documentation Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/documentation` | List all | ✅ | super_admin, admin |
| POST | `/documentation` | Upload | ✅ | super_admin, admin |
| GET | `/documentation/:id` | Get one | ✅ | super_admin, admin |
| DELETE | `/documentation/:id` | Delete | ✅ | super_admin, admin |

## Dashboard Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/dashboard/admin` | Admin stats | ✅ | super_admin, admin |
| GET | `/dashboard/customer-service` | CS stats | ✅ | customer_service |
| GET | `/dashboard/analytics/global` | Global analytics | ✅ | super_admin |

## Other Modules

Clusters, Handovers, Retentions, Timelines, WhatsApp mengikuti pola CRUD yang sama

---

## Common Query Parameters

```
skip=0          # Pagination offset
limit=10        # Items per page
status=active   # Filter by status
role=admin      # Filter by role
companyId=uuid  # Filter by company
projectId=uuid  # Filter by project
```

---

## Response Format

### Success (HTTP 200)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... } or [ ... ]
}
```

### Error (HTTP 4xx/5xx)
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

---

## Bearer Token Header

Semua endpoint yang memerlukan `✅` Auth harus include:

```
Authorization: Bearer <accessToken>
```

---

## Example: Login & Get Users

```javascript
// 1. Login
const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password123'
  })
});

const { data: { accessToken } } = await loginRes.json();

// 2. Get Users (dengan token)
const usersRes = await fetch('http://localhost:3000/api/v1/users', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const { data: users } = await usersRes.json();
console.log(users);
```

---

## Environment Setup

```bash
# .env.local (Frontend)
REACT_APP_API_URL=http://localhost:3000/api/v1

# atau production
REACT_APP_API_URL=https://api.podorukuntrack.com/api/v1
```
