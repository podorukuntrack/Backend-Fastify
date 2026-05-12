# FRONTEND INTEGRATION GUIDE - PodoRukunTrack API

Dokumentasi lengkap backend API untuk memudahkan implementasi tim frontend.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [API Overview](#api-overview)
3. [Authentication & Authorization](#authentication--authorization)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Modules & Endpoints](#modules--endpoints)
7. [Frontend Setup](#frontend-setup)
8. [Common Patterns](#common-patterns)

---

## Quick Start

### Environment Setup

```bash
# Backend sudah running di:
BASE_URL=http://localhost:3000

# atau production:
BASE_URL=https://api.podorukuntrack.com
```

### First Request (Login)

```javascript
// Contoh menggunakan fetch API
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
// Response: { success: true, message: '...', data: { accessToken, refreshToken, user } }

// Simpan token untuk request berikutnya
localStorage.setItem('accessToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

---

## API Overview

### Tech Stack Backend
- **Framework**: Fastify v5.8.5 (Node.js)
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT + Bcrypt
- **Cloud Storage**: Cloudflare R2
- **File Upload**: @fastify/multipart

### API Base URL
```
Development:  http://localhost:3000/api/v1
Production:   https://api.podorukuntrack.com/api/v1
```

### Supported Methods
- GET - Retrieve data
- POST - Create data
- PATCH - Update data
- DELETE - Delete data

---

## Authentication & Authorization

### 1. Login & Get Tokens

```javascript
// Endpoint: POST /auth/login
const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await loginResponse.json();
// data: {
//   accessToken: 'eyJhbGc...',
//   refreshToken: 'eyJhbGc...',
//   user: {
//     id: 'uuid',
//     email: 'user@example.com',
//     role: 'admin' | 'super_admin' | 'customer_service' | 'customer',
//     companyId: 'uuid'
//   }
// }
```

### 2. Use Token in Subsequent Requests

**Header yang wajib**: `Authorization: Bearer <accessToken>`

```javascript
const response = await fetch(`${BASE_URL}/users`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 3. Refresh Token (Ketika Access Token Expired)

```javascript
// Endpoint: POST /auth/refresh
const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: refreshToken  // dari localStorage
  })
});

const { data } = await refreshResponse.json();
// Dapatkan accessToken baru
localStorage.setItem('accessToken', data.accessToken);
```

### 4. Logout

```javascript
// Endpoint: POST /auth/logout
await fetch(`${BASE_URL}/auth/logout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: refreshToken
  })
});

// Bersihkan localStorage
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

### 5. Get Current User Info

```javascript
// Endpoint: GET /auth/me
// Memerlukan autentikasi!
const response = await fetch(`${BASE_URL}/auth/me`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data } = await response.json();
// data: user object dengan semua informasi
```

### Permission Matrix

| Role | Companies | Users | Projects | Units | Assignments | Payments | Tickets | Dashboard |
|------|-----------|-------|----------|-------|-------------|----------|---------|-----------|
| super_admin | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ READ | ✅ CRUD | ✅ Global |
| admin | ❌ | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ READ | ✅ CRUD | ✅ Company |
| customer_service | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ CRUD | ✅ Limited |
| customer | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ VIEW | ✅ OWN | ❌ |

---

## Response Format

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Example",
    "...": "..."
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

### List Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [
    { "id": "...", "name": "..." },
    { "id": "...", "name": "..." }
  ]
}
```

---

## Error Handling

### HTTP Status Codes
| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 400 | Bad Request | Cek validation error |
| 401 | Unauthorized | Token invalid/expired, refresh atau re-login |
| 403 | Forbidden | User tidak punya akses ke resource |
| 404 | Not Found | Resource tidak ada |
| 500 | Server Error | Contact backend team |

### Handling Errors di Frontend

```javascript
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle error
      if (response.status === 401) {
        // Token expired, refresh
        await refreshToken();
        return makeRequest(url, options); // retry
      } else if (response.status === 403) {
        // No permission
        showError('Anda tidak memiliki akses ke fitur ini');
      } else {
        showError(data.message);
      }
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Network error:', error);
    showError('Terjadi kesalahan jaringan');
    return null;
  }
}
```

---

## Modules & Endpoints

### 🔐 AUTH Module

#### POST /auth/login
Login dengan email & password
```javascript
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "companyId": "uuid"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token
```javascript
Request:
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### POST /auth/logout
Logout & invalidate token
```javascript
Request:
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

#### GET /auth/me
Get current user info (Requires Auth)
```javascript
Response:
{
  "success": true,
  "message": "Current user retrieved",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "companyId": "uuid"
  }
}
```

---

### 🏢 COMPANIES Module

**Akses**: Super Admin only

#### GET /companies
Get all companies
```javascript
// Query params:
// - skip: number (default: 0)
// - limit: number (default: 10)

const response = await fetch(`${BASE_URL}/companies?skip=0&limit=10`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### POST /companies
Create company
```javascript
Request:
{
  "name": "PT. Rukun Sejahtera"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "PT. Rukun Sejahtera",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /companies/:id
Get company by ID
```javascript
const response = await fetch(`${BASE_URL}/companies/550e8400-e29b-41d4-a716-446655440000`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### PATCH /companies/:id
Update company
```javascript
Request:
{
  "name": "PT. Rukun Sejahtera Baru"
}
```

#### DELETE /companies/:id
Delete company

---

### 👥 USERS Module

**Akses**: Super Admin, Admin

#### GET /users
Get all users
```javascript
// Query params:
// - skip: number
// - limit: number
// - role: 'admin' | 'customer_service' | 'customer'
// - companyId: uuid (filter by company)

const response = await fetch(`${BASE_URL}/users?skip=0&limit=20&role=admin`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### POST /users
Create new user
```javascript
Request:
{
  "email": "newuser@example.com",
  "password": "securepass123",
  "name": "New User",
  "role": "customer_service" | "admin" | "customer",
  "companyId": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "customer_service",
    "companyId": "uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /users/:id
Get user by ID

#### PATCH /users/:id
Update user
```javascript
Request:
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "role": "admin"
}
```

#### DELETE /users/:id
Delete user

---

### 📁 PROJECTS Module

**Akses**: Super Admin, Admin

#### GET /projects
Get all projects
```javascript
// Query params:
// - skip: number
// - limit: number
// - companyId: uuid
// - status: 'planning' | 'active' | 'completed'

const response = await fetch(`${BASE_URL}/projects?status=active`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### POST /projects
Create project
```javascript
Request:
{
  "name": "Residensial A",
  "description": "Proyek residensial modern",
  "companyId": "uuid",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "location": "Jakarta Selatan",
  "totalUnits": 50
}
```

#### GET /projects/:id
Get project by ID

#### PATCH /projects/:id
Update project
```javascript
Request:
{
  "name": "Updated Name",
  "status": "completed",
  "description": "..."
}
```

#### GET /projects/:id/stats
Get project statistics
```javascript
Response:
{
  "success": true,
  "data": {
    "totalUnits": 50,
    "unitsSold": 45,
    "unitsAvailable": 5,
    "totalRevenue": 4500000000,
    "completionPercentage": 90
  }
}
```

#### DELETE /projects/:id
Delete project

---

### 🏠 UNITS Module

**Akses**: Super Admin, Admin

#### GET /units
Get all units
```javascript
// Query params:
// - skip: number
// - limit: number
// - projectId: uuid
// - status: 'available' | 'sold' | 'reserved'

const response = await fetch(`${BASE_URL}/units?projectId=uuid&status=available`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### POST /units
Create unit
```javascript
Request:
{
  "projectId": "uuid",
  "unitCode": "A-101",
  "floor": 1,
  "price": 500000000,
  "size": 120,
  "bedrooms": 3,
  "bathrooms": 2,
  "description": "Unit with nice view"
}
```

#### GET /units/:id
Get unit by ID

#### PATCH /units/:id
Update unit
```javascript
Request:
{
  "price": 550000000,
  "status": "reserved"
}
```

#### DELETE /units/:id
Delete unit

---

### 📊 ASSIGNMENTS Module

**Akses**: Super Admin, Admin

Manajemen penempatan unit ke customer/pembeli

#### GET /assignments
Get all assignments
```javascript
// Query params:
// - skip: number
// - limit: number
// - unitId: uuid
// - customerId: uuid
// - status: 'pending' | 'approved' | 'rejected'
```

#### POST /assignments
Create assignment
```javascript
Request:
{
  "unitId": "uuid",
  "customerId": "uuid",
  "assignmentDate": "2024-01-15",
  "notes": "Customer prefer top floor"
}
```

#### PATCH /assignments/:id
Update assignment
```javascript
Request:
{
  "status": "approved",
  "approvedBy": "admin-id"
}
```

---

### 💰 PAYMENTS Module

**Akses**: Super Admin, Admin (READ); Customers (VIEW OWN)

#### GET /payments
Get all payments
```javascript
// Query params:
// - skip: number
// - limit: number
// - assignmentId: uuid
// - status: 'pending' | 'verified' | 'failed'
```

#### POST /payments
Create payment
```javascript
Request:
{
  "assignmentId": "uuid",
  "amount": 100000000,
  "paymentMethod": "bank_transfer" | "credit_card",
  "notes": "DP 20%"
}
```

#### GET /payments/:id
Get payment details

#### PATCH /payments/:id
Update payment
```javascript
Request:
{
  "status": "verified",
  "verifiedBy": "admin-id"
}
```

---

### 🎫 TICKETS Module

**Akses**: Super Admin, Admin, Customer Service (CRUD); Customers (OWN)

Customer support tickets

#### GET /tickets
Get all tickets
```javascript
// Query params:
// - skip: number
// - limit: number
// - status: 'open' | 'in_progress' | 'closed'
// - priority: 'low' | 'medium' | 'high'
// - companyId: uuid
```

#### POST /tickets
Create ticket
```javascript
Request:
{
  "title": "Unit tidak sesuai deskripsi",
  "description": "Ukuran kamar lebih kecil dari listing",
  "priority": "high",
  "category": "quality" | "payment" | "documentation" | "other"
}
```

#### GET /tickets/:id
Get ticket details

#### PATCH /tickets/:id
Update ticket
```javascript
Request:
{
  "status": "in_progress",
  "assignedTo": "staff-id",
  "resolution": "Akan dikonfirmasi dengan arsitek"
}
```

---

### 📈 PROGRESS Module

**Akses**: Super Admin, Admin

Track project progress & milestones

#### GET /progress
Get progress records
```javascript
// Query params:
// - projectId: uuid
// - skip: number
// - limit: number
```

#### POST /progress
Log progress
```javascript
Request:
{
  "projectId": "uuid",
  "percentage": 45,
  "description": "Foundation complete",
  "recordedDate": "2024-01-15"
}
```

#### PATCH /progress/:id
Update progress record
```javascript
Request:
{
  "percentage": 50,
  "description": "Updated status"
}
```

---

### 📚 DOCUMENTATION Module

**Akses**: Super Admin, Admin

Store project documentation & contracts

#### GET /documentation
Get all documents
```javascript
// Query params:
// - projectId: uuid
// - type: 'contract' | 'permit' | 'blueprint' | 'report'
```

#### POST /documentation
Upload document
```javascript
// Form Data:
// - projectId: uuid
// - type: 'contract' | 'permit' | 'blueprint' | 'report'
// - file: File object
// - description: string

const formData = new FormData();
formData.append('projectId', 'uuid');
formData.append('type', 'contract');
formData.append('file', fileInput.files[0]);
formData.append('description', 'Sales contract A');

const response = await fetch(`${BASE_URL}/documentation`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

#### GET /documentation/:id
Get document details

#### DELETE /documentation/:id
Delete document

---

### 📊 DASHBOARD Module

**Akses**: Super Admin, Admin, Customer Service

Different dashboards per role

#### GET /dashboard/admin
Admin dashboard (Requires: super_admin, admin)
```javascript
Response:
{
  "success": true,
  "data": {
    "total_projects": 15,
    "total_units": 250,
    "units_sold": 180,
    "open_tickets": 12,
    "total_revenue": 45000000000
  }
}
```

#### GET /dashboard/customer-service
Customer Service dashboard
```javascript
Response:
{
  "success": true,
  "data": {
    "open_tickets": 8,
    "pending_responses": 3,
    "wa_sent_today": 45
  }
}
```

#### GET /dashboard/analytics/global
Global analytics (Super Admin only)
```javascript
Response:
{
  "success": true,
  "data": {
    "total_companies": 5,
    "total_customers": 1200,
    "revenue_global": 150000000000
  }
}
```

---

### 🔗 Other Modules

Modules berikut mengikuti pola yang sama (GET, POST, PATCH, DELETE):
- **CLUSTERS** - Pengelompokan area/blok
- **HANDOVERS** - Serah terima unit
- **RETENTIONS** - Penahan pembayaran
- **TIMELINES** - Jadwal project
- **WHATSAPP** - Integrasi WhatsApp notifications

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Setup API Client

Buat file `src/api/client.js`:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

// Interceptor untuk menambah token otomatis
const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  // Auto refresh token jika expired
  if (response.status === 401 && localStorage.getItem('refreshToken')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiClient(endpoint, options); // Retry
    }
  }

  if (!response.ok) {
    throw new Error(data.message || 'API Error');
  }

  return data.data;
};

// Refresh token helper
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    window.location.href = '/login';
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return true;
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return false;
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
    window.location.href = '/login';
    return false;
  }
};

export { apiClient, refreshAccessToken };
```

### 3. Create Custom Hooks

`src/hooks/useApi.js`:

```javascript
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const useApi = (endpoint) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiClient(endpoint);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
};

// Hook untuk POST/PATCH/DELETE
export const useMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (endpoint, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient(endpoint, options);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
};
```

### 4. Setup Environment Variables

`.env.local`:

```
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_APP_NAME=PodoRukunTrack
```

---

## Common Patterns

### Pattern 1: Fetch List dengan Pagination

```javascript
const [users, setUsers] = useState([]);
const [page, setPage] = useState(0);
const [limit] = useState(10);

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const data = await apiClient(`/users?skip=${page * limit}&limit=${limit}`);
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  fetchUsers();
}, [page, limit]);

// Untuk pagination component:
<button onClick={() => setPage(page - 1)} disabled={page === 0}>
  Previous
</button>
<span>Page {page + 1}</span>
<button onClick={() => setPage(page + 1)}>
  Next
</button>
```

### Pattern 2: Create Form dengan Validation

```javascript
import { useState } from 'react';
import { useMutation } from '../hooks/useApi';

function CreateProjectForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    companyId: '',
    totalUnits: ''
  });
  
  const { execute, loading, error } = useMutation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await execute('/projects', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      // Success - reset form & redirect
      alert('Project created successfully!');
      setFormData({ name: '', description: '', companyId: '', totalUnits: '' });
      // Redirect or refetch data
    } catch (err) {
      // Error already set in hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        name="name" 
        value={formData.name} 
        onChange={handleChange}
        required
      />
      <input 
        name="description" 
        value={formData.description} 
        onChange={handleChange}
      />
      <select 
        name="companyId" 
        value={formData.companyId} 
        onChange={handleChange}
        required
      >
        <option>Select Company</option>
        {/* Options dari API */}
      </select>
      <input 
        type="number"
        name="totalUnits" 
        value={formData.totalUnits} 
        onChange={handleChange}
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Project'}
      </button>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
```

### Pattern 3: Edit/Update Data

```javascript
async function updateProject(projectId, updates) {
  try {
    const result = await apiClient(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    
    console.log('Updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}
```

### Pattern 4: Delete dengan Confirmation

```javascript
async function deleteProject(projectId) {
  if (window.confirm('Yakin ingin menghapus project ini?')) {
    try {
      await apiClient(`/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      alert('Project deleted successfully');
      // Refetch atau redirect
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  }
}
```

### Pattern 5: File Upload

```javascript
async function uploadDocument(projectId, file, type) {
  const formData = new FormData();
  formData.append('projectId', projectId);
  formData.append('type', type);
  formData.append('file', file);
  formData.append('description', 'Document description');

  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/documentation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('File uploaded:', data.data);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

---

## Troubleshooting

### "401 Unauthorized"
- Token sudah expired? Implement token refresh otomatis (lihat `useApi.js` hook)
- Pastikan token disertakan di header `Authorization: Bearer <token>`
- Clear localStorage dan login ulang

### "403 Forbidden"
- User tidak punya role yang sesuai
- Check permission matrix di bagian Authorization
- Hubungi admin untuk grant akses

### "400 Bad Request"
- Validasi data gagal
- Check response `errors` field untuk detail validation
- Pastikan format data sesuai dokumentasi

### CORS Issues
- Backend sudah di-setup dengan CORS. Jika masih error, check `app.js` di backend

---

## Testing dengan Postman

Download koleksi Postman: `PropTrack.postman_collection.json` di folder backend

Langkah:
1. Import collection ke Postman
2. Setup environment variable `{{BASE_URL}}` = `http://localhost:3000/api/v1`
3. Login terlebih dahulu di endpoint `/auth/login`
4. Copy access token hasil login
5. Paste di Postman tab Authorization > Bearer Token
6. Test semua endpoint

---

## Best Practices

✅ **DO**
- Simpan token di localStorage (atau sessionStorage untuk security)
- Implement auto-refresh untuk access token
- Show loading state saat fetch data
- Handle error dengan user-friendly messages
- Validate form data di frontend sebelum submit
- Use environment variables untuk API URL
- Implement proper error boundaries di React

❌ **DON'T**
- Expose token di URL query string
- Hardcode API URL
- Show raw error messages dari backend ke user
- Skip authentication checks
- Send password atau token di query params
- Store sensitive data di localStorage tanpa encryption

---

## Support & Questions

- Backend docs: `/DOKUMENTASI_LENGKAP.md`
- API Spec: `/API_SPEC.md`
- Team backend: Silahkan tanya untuk clarification
- Swagger UI: `http://localhost:3000/documentation`

Happy Coding! 🚀
