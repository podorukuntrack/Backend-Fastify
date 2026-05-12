# Frontend Setup Checklist

Checklist lengkap untuk setup dan implementasi frontend integration dengan backend API.

## ✅ Phase 1: Preparation (Sebelum Development)

- [ ] Read [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)
- [ ] Bookmark [API_ENDPOINTS_QUICK_REFERENCE.md](API_ENDPOINTS_QUICK_REFERENCE.md)
- [ ] Ensure backend is running: `npm run dev` (di folder backend/fastify)
- [ ] Test backend dengan Postman (import `PropTrack.postman_collection.json`)
- [ ] Verify environment variables untuk API_URL

---

## ✅ Phase 2: API Client Setup

### Create Base API Client

- [ ] Create file: `src/api/client.js`
- [ ] Implement basic fetch with auth header
- [ ] Add auto-refresh token logic
- [ ] Add error handling
- [ ] Test login & token storage

**Minimal Implementation:**
```javascript
// src/api/client.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  });

  const data = await response.json();
  
  if (!response.ok) throw new Error(data.message);
  return data.data;
};
```

---

## ✅ Phase 3: Context & State Management

### Auth Context

- [ ] Create file: `src/context/AuthContext.jsx`
- [ ] Implement login function
- [ ] Implement logout function
- [ ] Implement token refresh
- [ ] Implement "Get Current User"
- [ ] Wrap app with AuthProvider
- [ ] Test login/logout flow

**Minimal Implementation:**
```javascript
// src/context/AuthContext.jsx
import { createContext, useState } from 'react';
import { apiClient } from '../api/client';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await apiClient('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
    });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## ✅ Phase 4: Custom Hooks

### useApi Hook (GET)

- [ ] Create file: `src/hooks/useApi.js`
- [ ] Implement data fetching
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Test dengan real endpoint

### useMutation Hook (POST/PATCH/DELETE)

- [ ] Implement POST requests
- [ ] Implement PATCH requests
- [ ] Implement DELETE requests
- [ ] Handle success/error responses
- [ ] Test form submission

---

## ✅ Phase 5: Authentication Pages

### Login Page

- [ ] Create file: `src/pages/auth/LoginPage.jsx`
- [ ] Create login form (email + password)
- [ ] Call login endpoint
- [ ] Handle validation errors
- [ ] Redirect ke dashboard on success
- [ ] Test login flow

### Protected Routes

- [ ] Create `ProtectedRoute.jsx` component
- [ ] Redirect to login if not authenticated
- [ ] Check user role for authorization
- [ ] Test route protection

---

## ✅ Phase 6: Core Features (By Module)

### Dashboard

- [ ] Create file: `src/pages/dashboard/DashboardPage.jsx`
- [ ] Fetch dashboard data (GET /dashboard/admin atau /dashboard/customer-service)
- [ ] Display stats cards
- [ ] Create charts/graphs if needed
- [ ] Test real data display

### Users Management

- [ ] Create file: `src/pages/users/UsersPage.jsx`
- [ ] Implement list users (GET /users)
- [ ] Implement create user form (POST /users)
- [ ] Implement edit user form (PATCH /users/:id)
- [ ] Implement delete user (DELETE /users/:id)
- [ ] Add pagination
- [ ] Test CRUD operations

### Companies Management

- [ ] Create file: `src/pages/companies/CompaniesPage.jsx`
- [ ] Implement list companies
- [ ] Implement create company
- [ ] Implement edit company
- [ ] Implement delete company
- [ ] Test all operations

### Projects Management

- [ ] Create file: `src/pages/projects/ProjectsPage.jsx`
- [ ] Implement list projects with filters
- [ ] Implement create project form
- [ ] Implement edit project
- [ ] Implement delete project
- [ ] Fetch project stats (GET /projects/:id/stats)
- [ ] Test all operations

### Units Management

- [ ] Create file: `src/pages/units/UnitsPage.jsx`
- [ ] Implement list units with filters
- [ ] Implement create unit form
- [ ] Implement edit unit
- [ ] Implement delete unit
- [ ] Add search/filter by project, status
- [ ] Test all operations

### Assignments

- [ ] Create file: `src/pages/assignments/AssignmentsPage.jsx`
- [ ] List assignments
- [ ] Create assignment form
- [ ] Update assignment (approve/reject)
- [ ] View assignment details

### Payments

- [ ] Create file: `src/pages/payments/PaymentsPage.jsx`
- [ ] List payments
- [ ] Create payment record
- [ ] Update payment status
- [ ] View payment details
- [ ] Filter by status

### Tickets (Support)

- [ ] Create file: `src/pages/tickets/TicketsPage.jsx`
- [ ] List tickets
- [ ] Create ticket form
- [ ] Update ticket (assign, resolve)
- [ ] Filter by status & priority
- [ ] Show ticket details

### Documentation

- [ ] Create file: `src/pages/documentation/DocumentationPage.jsx`
- [ ] List documents by project
- [ ] Upload file form
- [ ] Download/view document
- [ ] Delete document
- [ ] Filter by type

---

## ✅ Phase 7: Common Components

### Pagination Component

- [ ] Create file: `src/components/ui/Pagination.jsx`
- [ ] Handle next/previous
- [ ] Display current page
- [ ] Disable buttons at boundaries
- [ ] Use in all list pages

### Loading Spinner

- [ ] Create file: `src/components/ui/LoadingSpinner.jsx`
- [ ] Use in all data fetching
- [ ] Show while loading

### Error Alert

- [ ] Create file: `src/components/ui/ErrorAlert.jsx`
- [ ] Display error messages
- [ ] Allow dismiss
- [ ] Use in all forms

### Form Component

- [ ] Create file: `src/components/ui/Form.jsx` atau reusable form hooks
- [ ] Standard form input
- [ ] Standard form validation
- [ ] Loading button state
- [ ] Error message display

---

## ✅ Phase 8: Advanced Features

### File Upload

- [ ] Implement documentation upload
- [ ] Handle multipart/form-data
- [ ] Show upload progress
- [ ] Validate file type & size
- [ ] Test with real files

### Filters & Search

- [ ] Add search input for entities
- [ ] Implement filter by status
- [ ] Implement filter by date range
- [ ] Implement filter by company/project
- [ ] Persist filters in URL params

### Data Export (Optional)

- [ ] Export to CSV
- [ ] Export to PDF (if needed)
- [ ] Export selected items

### Real-time Updates (Optional)

- [ ] Setup auto-refresh if needed
- [ ] Implement WebSocket if real-time required
- [ ] Sync data between tabs

---

## ✅ Phase 9: Error Handling & Validation

### Frontend Validation

- [ ] Validate email format
- [ ] Validate required fields
- [ ] Validate phone numbers
- [ ] Validate UUID format for IDs
- [ ] Show validation errors inline

### API Error Handling

- [ ] Catch 401 errors (unauthorized)
- [ ] Catch 403 errors (forbidden)
- [ ] Catch 400 errors (bad request)
- [ ] Catch 500 errors (server error)
- [ ] Show user-friendly error messages
- [ ] Log errors for debugging

### Network Error Handling

- [ ] Handle network timeouts
- [ ] Handle no internet connection
- [ ] Implement retry logic
- [ ] Show offline indicator

---

## ✅ Phase 10: Testing

### Manual Testing

- [ ] Test each CRUD operation
- [ ] Test with different user roles
- [ ] Test with invalid data
- [ ] Test token refresh
- [ ] Test logout flow
- [ ] Test pagination
- [ ] Test filters & search
- [ ] Test file upload
- [ ] Test error cases

### API Testing with Postman

- [ ] Import collection
- [ ] Test all endpoints
- [ ] Verify response format
- [ ] Test with invalid tokens
- [ ] Test authorization by role

---

## ✅ Phase 11: Optimization

### Performance

- [ ] Implement data caching
- [ ] Lazy load routes
- [ ] Optimize images
- [ ] Minimize API calls
- [ ] Use React.memo for components
- [ ] Profile with React DevTools

### Browser Compatibility

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Test on mobile browsers

---

## ✅ Phase 12: Deployment Preparation

### Environment Variables

- [ ] Setup `.env.local` for development
- [ ] Create `.env.production` for production
- [ ] Use `REACT_APP_API_URL` for API
- [ ] Never commit secrets

### Build & Deploy

- [ ] Build for production: `npm run build`
- [ ] Test production build locally
- [ ] Setup CI/CD pipeline
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Test live API calls

---

## ✅ Phase 13: Documentation & Handoff

### Code Documentation

- [ ] Add JSDoc comments to functions
- [ ] Document custom hooks
- [ ] Document complex logic
- [ ] Add README for setup

### Team Handoff

- [ ] Document any gotchas
- [ ] Document non-standard implementations
- [ ] Create development guide
- [ ] List known issues/TODOs

---

## 🔍 Quality Checklist

- [ ] No console errors or warnings
- [ ] No hardcoded URLs or secrets
- [ ] All error cases handled
- [ ] Loading states visible
- [ ] Forms have proper validation
- [ ] Authentication works seamlessly
- [ ] Token refresh works automatically
- [ ] Responsive on mobile
- [ ] Accessible (basic WCAG compliance)
- [ ] Performance is acceptable

---

## 📚 Useful Resources

- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) - Lengkap API documentation
- [API_ENDPOINTS_QUICK_REFERENCE.md](API_ENDPOINTS_QUICK_REFERENCE.md) - Quick lookup table
- Postman Collection: `PropTrack.postman_collection.json`
- Backend Swagger UI: `http://localhost:3000/documentation`

---

## 💡 Tips & Tricks

1. **Start Simple**: Implement login page first, then expand to other modules
2. **Test Often**: Test with Postman before coding React components
3. **Use Environment Variables**: Never hardcode URLs
4. **Handle Errors Gracefully**: Always show meaningful error messages
5. **Keep Components Small**: Makes testing and reuse easier
6. **Centralize API Logic**: Use hooks/context for all API calls
7. **Monitor Network Tab**: Check actual API requests in browser DevTools
8. **Read API Responses**: Log responses to understand data structure

---

## ❓ Troubleshooting

### "Cannot read property 'accessToken' of undefined"
→ Check login API response matches expected structure

### "401 Unauthorized"
→ Token missing or expired. Check Authorization header

### "403 Forbidden"
→ User doesn't have permission. Check role-based access

### "CORS Error"
→ Backend CORS not configured (backend team)

### "Form not submitting"
→ Check form validation, network tab for actual request

### "Data not updating after API call"
→ Need to refetch data or update state manually

---

## 🚀 Ready to Start?

1. Start with Phase 1-3 (Setup & Auth)
2. Test everything works
3. Proceed to Phase 4-6 (Features)
4. Expand to all modules
5. Polish & test thoroughly
6. Deploy!

Good luck! 💪
