# Backend API Documentation Index

📚 Dokumentasi lengkap untuk implementasi frontend dengan backend API PodoRukunTrack.

---

## 🚀 Quick Start (5 minutes)

Jika Anda baru, mulai dari sini:

1. **First Time?** → Baca [ENVIRONMENT_SETUP_GUIDE.md](ENVIRONMENT_SETUP_GUIDE.md)
2. **Setup Done?** → Baca [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) (Bagian Quick Start)
3. **Need API Endpoints?** → Lihat [API_ENDPOINTS_QUICK_REFERENCE.md](API_ENDPOINTS_QUICK_REFERENCE.md)
4. **Ready to Code?** → Copy templates dari [API_CLIENT_BOILERPLATE.md](API_CLIENT_BOILERPLATE.md)

---

## 📖 All Documentation Files

### 1. **ENVIRONMENT_SETUP_GUIDE.md** ⚙️
**Untuk**: Tim yang setup pertama kali
**Konten**:
- Setup backend (Node.js, PostgreSQL)
- Setup frontend (npm, dependencies)
- Konfigurasi environment variables
- Menjalankan backend & frontend
- Troubleshooting umum

**👉 Mulai dari sini jika belum ada setup apapun**

---

### 2. **FRONTEND_INTEGRATION_GUIDE.md** 📘
**Untuk**: Frontend developer yang ingin implementasi
**Konten**:
- Overview tech stack & API
- Authentication & token management
- Response format & error handling
- Semua endpoints (Auth, Users, Companies, Projects, Units, etc.)
- Common integration patterns
- Praktik terbaik

**👉 Referensi utama untuk implementasi feature**

---

### 3. **API_ENDPOINTS_QUICK_REFERENCE.md** ⚡
**Untuk**: Lookup cepat endpoint & methods
**Konten**:
- Tabel semua endpoint HTTP
- Required auth & role
- Query parameters
- Response format
- Contoh minimal

**👉 Bookmark ini! Gunakan saat develop untuk quick lookup**

---

### 4. **API_CLIENT_BOILERPLATE.md** 💻
**Untuk**: Copy-paste ready-to-use code
**Konten**:
- Setup API client (fetch wrapper)
- Auth context dengan login/logout
- Custom hooks (useApi, useMutation)
- Protected routes
- Contoh page implementations (Login, Users, Dashboard)
- Service pattern untuk API calls

**👉 Copy-paste ini untuk accelerate development**

---

### 5. **FRONTEND_SETUP_CHECKLIST.md** ✅
**Untuk**: Planning & tracking progress
**Konten**:
- Phase-by-phase checklist
- All features breakdown
- Testing checklist
- Deployment preparation

**👉 Gunakan untuk planning & progress tracking**

---

## 🎯 Use Case Guide

### Saya baru mulai, dari mana?

```
1. ENVIRONMENT_SETUP_GUIDE.md
   ↓ Setup done
2. FRONTEND_INTEGRATION_GUIDE.md (Baca Quick Start section)
   ↓ Siap code
3. API_CLIENT_BOILERPLATE.md (Copy api/client.js)
   ↓ Mulai dengan Auth
4. Referensi FRONTEND_INTEGRATION_GUIDE untuk endpoint detail
```

---

### Saya perlu tahu endpoint mana saja?

```
→ API_ENDPOINTS_QUICK_REFERENCE.md

Lihat tabel lengkap semua endpoint dengan method, auth, role
```

---

### Saya mau implementasi Login

```
1. API_CLIENT_BOILERPLATE.md → Copy API client & Auth Context
2. FRONTEND_INTEGRATION_GUIDE.md → Lihat Auth section
3. API_ENDPOINTS_QUICK_REFERENCE.md → Lihat /auth/login endpoint
```

---

### Saya mau implementasi Users CRUD

```
1. API_ENDPOINTS_QUICK_REFERENCE.md → Lihat Users endpoints
2. API_CLIENT_BOILERPLATE.md → Copy userService pattern
3. API_CLIENT_BOILERPLATE.md → Copy UsersPage example
4. FRONTEND_INTEGRATION_GUIDE.md → Lihat Users Module section
```

---

### Saya perlu implementasi file upload

```
1. FRONTEND_INTEGRATION_GUIDE.md → Cari "File Upload"
2. API_ENDPOINTS_QUICK_REFERENCE.md → Lihat /documentation endpoint
3. API_CLIENT_BOILERPLATE.md → Copy upload pattern
```

---

### Ada error/troubleshooting

```
1. FRONTEND_INTEGRATION_GUIDE.md → Error Handling section
2. ENVIRONMENT_SETUP_GUIDE.md → Troubleshooting section
3. Check browser console & network tab (DevTools)
4. Test endpoint di Postman dulu sebelum React
```

---

## 📚 Documentation Map

```
ENVIRONMENT_SETUP_GUIDE.md
├── Backend Setup
├── Frontend Setup
├── Database Setup
├── Environment Variables
├── Running Application
└── Troubleshooting

FRONTEND_INTEGRATION_GUIDE.md
├── Quick Start
├── API Overview
├── Authentication
│   ├── Login
│   ├── Refresh Token
│   └── Permission Matrix
├── Response Format
├── Error Handling
├── Modules
│   ├── AUTH
│   ├── COMPANIES
│   ├── USERS
│   ├── PROJECTS
│   ├── UNITS
│   ├── ASSIGNMENTS
│   ├── PAYMENTS
│   ├── TICKETS
│   ├── PROGRESS
│   ├── DOCUMENTATION
│   └── DASHBOARD
├── Frontend Setup
├── Common Patterns
└── Troubleshooting

API_ENDPOINTS_QUICK_REFERENCE.md
├── Endpoints by Module
├── Query Parameters
├── Response Format
├── Bearer Token
└── Example

API_CLIENT_BOILERPLATE.md
├── API Client Setup
├── Auth Context
├── Custom Hooks
├── Protected Routes
├── Example Pages
├── Services Pattern
└── App Setup

FRONTEND_SETUP_CHECKLIST.md
├── Phase 1: Preparation
├── Phase 2: API Client
├── Phase 3: Context & State
├── Phase 4: Hooks
├── Phase 5: Auth Pages
├── Phase 6: Core Features
├── Phase 7: Components
├── Phase 8: Advanced Features
├── Phase 9: Error Handling
├── Phase 10: Testing
├── Phase 11: Optimization
├── Phase 12: Deployment
└── Phase 13: Documentation
```

---

## 🔑 Key Concepts

### Authentication Flow

```
1. User Input Email & Password
   ↓
2. POST /auth/login → Get accessToken & refreshToken
   ↓
3. Save tokens to localStorage
   ↓
4. Use accessToken in Authorization header untuk semua request
   ↓
5. Token expired? POST /auth/refresh untuk get token baru
   ↓
6. Logout: POST /auth/logout & clear localStorage
```

### Permission Levels

| Role | Level | Access |
|------|-------|--------|
| super_admin | 5 | All features |
| admin | 4 | Company features |
| customer_service | 3 | Support only |
| customer | 2 | Own data only |

### Common Response Pattern

```json
Success:
{
  "success": true,
  "message": "...",
  "data": { /* actual data */ }
}

Error:
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

---

## 🛠️ Development Workflow

### Recommended Process

```
1. Read documentation section yang relevant
2. Check endpoint di API_ENDPOINTS_QUICK_REFERENCE
3. Test endpoint di Postman terlebih dahulu
4. Buat React component dengan template dari boilerplate
5. Test di browser dengan real API
6. Troubleshoot jika ada error
7. Refactor & optimize
```

### File Structure untuk New Feature

```
frontend/
├── api/
│   └── client.js                    # Sudah ada
├── context/
│   └── AuthContext.jsx              # Sudah ada
├── hooks/
│   ├── useApi.js                    # Sudah ada
│   └── useNewFeature.js             # BUAT INI (optional)
├── services/
│   └── newFeatureService.js         # BUAT INI
├── pages/
│   └── newFeature/
│       ├── NewFeaturePage.jsx       # BUAT INI
│       └── NewFeatureForm.jsx       # BUAT INI (optional)
└── components/
    └── NewFeatureCard.jsx           # BUAT INI (optional)
```

---

## ✨ Best Practices Checklist

When implementing any feature:

- [ ] Read relevant documentation section
- [ ] Plan component structure
- [ ] Setup API service first (test in Postman)
- [ ] Create custom hook for data fetching
- [ ] Create React component
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add form validation
- [ ] Test in browser
- [ ] Handle edge cases
- [ ] Add comments to code
- [ ] Refactor if needed

---

## 🔗 External Resources

- **Node.js**: https://nodejs.org/
- **React Docs**: https://react.dev/
- **React Router**: https://reactrouter.com/
- **Fetch API**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **Postman**: https://www.postman.com/

---

## 📝 Notes for Frontend Team

1. **Start with authentication** - Implement login first, everything else depends on it
2. **Test with Postman first** - Always verify API before React component
3. **Use the boilerplate** - Don't reinvent the wheel, use provided templates
4. **Keep it DRY** - Extract common logic to hooks & services
5. **Handle errors** - Users should see meaningful error messages
6. **Load states matter** - Show spinners/loading while fetching data
7. **Mobile first** - Test on mobile devices
8. **Read the docs** - It's comprehensive for a reason!

---

## 🆘 Getting Help

### Check these first:

1. **Documentation** - Likely sudah dijawab di sini
2. **Postman** - Test endpoint terlebih dahulu
3. **Browser DevTools** - Check console & network tab
4. **API Error Message** - Usually explains what's wrong
5. **Boilerplate Code** - Copy-paste pattern untuk solusi cepat

### Then ask backend team:

- API behavior questions
- Database/permission issues
- Endpoint functionality
- Error code meanings

---

## 📞 Support Channels

- **Documentation**: Files dalam folder ini
- **Postman Collection**: `PropTrack.postman_collection.json`
- **Swagger UI**: http://localhost:3000/documentation
- **Backend Team**: Direct communication for API questions
- **Frontend Team**: Collaborate dengan team member lain

---

## 🚀 Deployment Checklist

Before production deploy:

- [ ] All environment variables configured
- [ ] API_URL pointing to production backend
- [ ] Remove console.logs & debug code
- [ ] Test all features in production-like environment
- [ ] Performance optimizations done
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Error tracking setup (optional)
- [ ] Analytics setup (optional)
- [ ] Backup & disaster recovery plan

---

## 📈 Versioning & Updates

**Current Version**: 1.0.0 (as of May 2024)

This documentation covers:
- ✅ Fastify v5.8.5 backend
- ✅ React with Vite frontend
- ✅ All 17+ modules
- ✅ JWT authentication
- ✅ Role-based access control

---

## 💡 Pro Tips

1. **Use Environment Variables** - Never hardcode URLs or secrets
2. **Implement Token Refresh** - Handle expired tokens gracefully
3. **Cache Strategically** - Reduce API calls with caching
4. **Validate Forms** - Before sending to API
5. **Show Loading States** - Better UX with spinners
6. **Handle All Errors** - 401, 403, 400, 500 cases
7. **Use Services** - Centralize API calls
8. **Lazy Load Routes** - Improve performance
9. **Test Features** - Before considering done
10. **Document Code** - For team understanding

---

## 🎓 Learning Path

If you're new to all this:

1. **Week 1**: Setup environment & understand architecture
2. **Week 2**: Implement authentication & basic CRUD
3. **Week 3**: Implement all modules & features
4. **Week 4**: Polish, test, optimize & deploy

---

## Final Notes

- Dokumentasi ini dibuat dengan detail untuk accelerate development
- Copy-paste code dari boilerplate untuk hemat waktu
- Jangan skip error handling - penting untuk production
- Test semuanya - jangan asumsikan API bekerja
- Ask questions - lebih baik bertanya daripada salah implementasi
- Happy coding! 🚀

---

**Last Updated**: May 2024
**Status**: Complete & Ready for Implementation
**Questions?**: Contact backend team or check documentation again

Selamat mengimplementasikan! 💪
