# Environment Setup Guide

Panduan lengkap untuk setup environment dan menjalankan frontend dengan backend API.

---

## Table of Contents

1. [Backend Setup](#backend-setup)
2. [Frontend Setup](#frontend-setup)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Running the Application](#running-the-application)
6. [Verification Checklist](#verification-checklist)

---

## Backend Setup

### Prerequisites

- Node.js v18+ ([Download](https://nodejs.org/))
- npm v9+ (comes with Node.js)
- PostgreSQL atau Neon account ([Free Tier](https://neon.tech/))
- Git

### Installation

```bash
# Navigate to backend folder
cd d:\Project\ Web\PodoRukunTrack\fastify

# Install dependencies
npm install

# Copy environment file
copy .env.example .env  # Windows
# atau
cp .env.example .env   # macOS/Linux
```

### Environment Variables

Buat file `.env` di folder `fastify/`:

```env
# Server
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars

# Cloudflare R2 (for file upload)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=proptrack-storage
R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Database Setup

**Option A: Using Neon (Recommended for Development)**

1. Create account at [Neon](https://neon.tech/)
2. Create new project & database
3. Copy connection string
4. Paste ke `DATABASE_URL` di `.env`

**Option B: Local PostgreSQL**

```bash
# Windows
# Download PostgreSQL installer: https://www.postgresql.org/download/windows/

# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database
createdb proptrack_dev

# Create user
createuser proptrack_user -P
# Enter password when prompted

# Update .env
DATABASE_URL=postgresql://proptrack_user:password@localhost:5432/proptrack_dev
```

### Run Backend

```bash
# Development (dengan auto-reload)
npm run dev

# atau production
npm start

# Expected output:
# 🚀 Server running on http://localhost:3000
```

### Verify Backend

```bash
# Test health check
curl http://localhost:3000/health

# atau buka di browser
http://localhost:3000/documentation
# Anda akan melihat Swagger UI
```

---

## Frontend Setup

### Prerequisites

- Node.js v18+
- npm v9+
- Code editor (VS Code recommended)

### Installation

```bash
# Navigate to frontend folder
cd d:\Project\ Web\PodoRukunTrack\frontend

# Install dependencies
npm install

# Note: kalau ada error, coba:
npm cache clean --force
npm install
```

### Create Environment Files

**File: `.env.local` (Development)**

```env
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_APP_NAME=PodoRukunTrack
REACT_APP_DEBUG=true
```

**File: `.env.production` (Production)**

```env
REACT_APP_API_URL=https://api.podorukuntrack.com/api/v1
REACT_APP_APP_NAME=PodoRukunTrack
REACT_APP_DEBUG=false
```

### Install Recommended Packages

```bash
npm install react-router-dom          # Routing
npm install axios                      # HTTP client (alternative to fetch)
npm install zustand                    # State management
npm install react-toastify            # Toast notifications
npm install tailwindcss               # Already in project
```

### Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js                 # API client setup
│   ├── components/
│   │   ├── ui/                       # Reusable UI components
│   │   └── layout/                   # Layout components
│   ├── context/
│   │   └── AuthContext.jsx           # Auth state management
│   ├── hooks/
│   │   ├── useApi.js                 # Data fetching hook
│   │   └── useAuth.js                # Auth hook
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── projects/
│   │   └── ...
│   ├── services/
│   │   ├── userService.js
│   │   ├── projectService.js
│   │   └── ...
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── .env.local
├── .env.production
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Run Frontend

```bash
# Development server (dengan hot reload)
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview

# Expected output:
# ➜  Local:   http://localhost:5173/
```

---

## Database Setup

### Create Tables (First Time)

If you haven't created tables yet, backend akan auto-create jika menggunakan Drizzle ORM migrations.

```bash
# Navigate to backend
cd fastify

# Run migrations (jika ada)
npm run migrate

# atau seed initial data
node seedsuperadmin.js
```

### Seed Data

```bash
# Create super admin user
node seedsuperadmin.js

# Output:
# Super admin created successfully
# Email: admin@proptrack.com
# Password: Check console or code
```

---

## Environment Variables

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| DATABASE_URL | - | PostgreSQL connection string |
| JWT_SECRET | - | Secret key untuk JWT signing |
| JWT_REFRESH_SECRET | - | Secret key untuk refresh token |
| R2_ACCOUNT_ID | - | Cloudflare R2 Account ID |
| R2_ACCESS_KEY_ID | - | R2 Access Key |
| R2_SECRET_ACCESS_KEY | - | R2 Secret Key |
| R2_BUCKET_NAME | - | R2 Bucket name |
| R2_PUBLIC_URL | - | R2 Public URL |
| CORS_ORIGIN | * | CORS allowed origins |

### Frontend (.env.local)

| Variable | Default | Description |
|----------|---------|-------------|
| REACT_APP_API_URL | http://localhost:3000/api/v1 | Backend API URL |
| REACT_APP_APP_NAME | PodoRukunTrack | App name |
| REACT_APP_DEBUG | true | Debug mode |

---

## Running the Application

### Option 1: Separate Terminals

**Terminal 1 - Backend:**
```bash
cd fastify
npm run dev
# Server running on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App running on http://localhost:5173
```

### Option 2: Using VS Code Tasks

**Create: `.vscode/tasks.json`**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Backend Dev",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "${workspaceFolder}/fastify",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": ".*",
          "line": 1
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": ".*",
          "endsPattern": ".*"
        }
      }
    },
    {
      "label": "Frontend Dev",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "${workspaceFolder}/frontend",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": ".*",
          "line": 1
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": ".*",
          "endsPattern": ".*"
        }
      }
    },
    {
      "label": "Run Both",
      "dependsOn": ["Backend Dev", "Frontend Dev"],
      "problemMatcher": []
    }
  ]
}
```

Then run: `Ctrl+Shift+P` → "Run Task" → "Run Both"

### Option 3: Using npm-run-all (Monorepo Style)

```bash
# Install globally
npm install -g npm-run-all

# Create script in main package.json (root directory)
# "dev": "npm-run-all --parallel dev:backend dev:frontend"
# "dev:backend": "cd fastify && npm run dev"
# "dev:frontend": "cd frontend && npm run dev"

# Then run:
npm run dev
```

---

## Verification Checklist

### Backend Verification

- [ ] Backend server running on http://localhost:3000
- [ ] Database connected successfully
- [ ] Can see Swagger UI: http://localhost:3000/documentation
- [ ] Login endpoint works: Try in Postman
- [ ] CORS headers present in responses

### Frontend Verification

- [ ] Frontend running on http://localhost:5173
- [ ] Login page loads successfully
- [ ] Can log in with test credentials
- [ ] Dashboard loads after login
- [ ] Token saved in localStorage
- [ ] Can refresh page without losing session
- [ ] Logout works correctly
- [ ] Redirects to login when token expired

### Integration Verification

```javascript
// Test in browser console after login:

// 1. Check token in localStorage
localStorage.getItem('accessToken')
// Output: eyJhbGc...

// 2. Test API call
fetch('http://localhost:3000/api/v1/users', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json()).then(d => console.log(d))
// Output: { success: true, message: "...", data: [...] }
```

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check DATABASE_URL in .env
echo %DATABASE_URL%  # Windows
echo $DATABASE_URL   # macOS/Linux

# Test connection
psql $DATABASE_URL   # or use pg_client tool
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Windows - Find & kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port in .env
PORT=3001
```

### Issue: "CORS errors in browser"

**Solution:**
```javascript
// Check .env CORS_ORIGIN
// Should include http://localhost:5173 for frontend
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

// Restart backend after change
```

### Issue: "401 Unauthorized errors"

**Solution:**
```javascript
// 1. Check token in localStorage
localStorage.getItem('accessToken')

// 2. Check if token expired
// Implement auto-refresh in apiClient

// 3. Try login again
// Clear localStorage and re-login
localStorage.clear()
```

### Issue: "npm install fails"

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: "Vite/React shows blank page"

**Solution:**
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Check browser console for errors
# Check network tab for failed API calls
# Verify REACT_APP_API_URL in .env.local
```

---

## Development Best Practices

### 1. Use Environment Variables

```javascript
// ✅ Good
const API_URL = process.env.REACT_APP_API_URL;

// ❌ Bad
const API_URL = 'http://localhost:3000';
```

### 2. Handle Errors Gracefully

```javascript
// ✅ Good
try {
  const data = await apiClient('/endpoint');
  setData(data);
} catch (error) {
  setError(error.message);
}

// ❌ Bad
const data = await apiClient('/endpoint');
setData(data);
```

### 3. Use Loading States

```javascript
// ✅ Good
const [loading, setLoading] = useState(false);
// Show spinner while loading

// ❌ Bad
// No loading indicator
```

### 4. Validate Before Sending

```javascript
// ✅ Good
if (!email || !password) {
  setError('Email dan password harus diisi');
  return;
}

// ❌ Bad
// Send empty values to API
```

---

## Debugging Tips

### Backend Debugging

```bash
# Enable debug logging
DEBUG=* npm run dev

# Check logs
cat logs/app.log  # atau view in console

# Use Postman for API testing
# Import PropTrack.postman_collection.json
```

### Frontend Debugging

```javascript
// Browser DevTools
// 1. Open: F12 or Ctrl+Shift+I
// 2. Check Console tab for errors
// 3. Check Network tab for API calls
// 4. Check Storage tab for tokens

// Add console.logs in code
console.log('Data:', data);
console.log('Error:', error);

// Use React DevTools extension
// Install: Chrome Web Store
```

---

## Next Steps

1. ✅ Follow this guide to setup environment
2. ✅ Run backend & frontend successfully
3. ✅ Read [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)
4. ✅ Follow [FRONTEND_SETUP_CHECKLIST.md](FRONTEND_SETUP_CHECKLIST.md)
5. ✅ Use [API_CLIENT_BOILERPLATE.md](API_CLIENT_BOILERPLATE.md) for code templates
6. ✅ Reference [API_ENDPOINTS_QUICK_REFERENCE.md](API_ENDPOINTS_QUICK_REFERENCE.md) for endpoints
7. ✅ Start implementing features!

---

## Quick Links

- [Frontend Integration Guide](FRONTEND_INTEGRATION_GUIDE.md)
- [Setup Checklist](FRONTEND_SETUP_CHECKLIST.md)
- [API Boilerplate](API_CLIENT_BOILERPLATE.md)
- [API Quick Reference](API_ENDPOINTS_QUICK_REFERENCE.md)
- [Backend Docs](DOKUMENTASI_LENGKAP.md)

---

## Support

- Check existing documentation first
- Review Swagger UI: http://localhost:3000/documentation
- Look at error messages in browser console & network tab
- Test endpoint in Postman before React component
- Ask backend team for API clarification

Happy Coding! 🚀
