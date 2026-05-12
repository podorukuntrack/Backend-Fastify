# API Client Boilerplate

Kode template siap pakai untuk frontend integration dengan backend API.

---

## Table of Contents

1. [API Client Setup](#api-client-setup)
2. [Auth Context](#auth-context)
3. [Custom Hooks](#custom-hooks)
4. [Protected Routes](#protected-routes)
5. [Example Pages](#example-pages)
6. [Services Pattern](#services-pattern)

---

## API Client Setup

### File: `src/api/client.js`

```javascript
// Base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

/**
 * Main API client function
 * Automatically includes Authorization header
 * Handles token refresh on 401
 */
export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle 401 - Token expired, try to refresh
    if (response.status === 401 && localStorage.getItem('refreshToken')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the original request with new token
        return apiClient(endpoint, options);
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return null;
      }
    }

    if (!response.ok) {
      const error = new Error(data.message || 'API Error');
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data.data; // Return only data property
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      return true;
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  }
}

export { refreshAccessToken, API_BASE_URL };
```

---

## Auth Context

### File: `src/context/AuthContext.jsx`

```javascript
import { createContext, useState, useCallback, useEffect } from 'react';
import { apiClient, API_BASE_URL } from '../api/client';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Could verify token here
        // For now, we'll fetch user on demand
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      // Save tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Save user
      setUser(data.data.user);

      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      }

      // Clear storage and state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear state even if API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  /**
   * Fetch current user info
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await apiClient('/auth/me');
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      // If 401, user is not authenticated
      if (err.status === 401) {
        setUser(null);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user info in context
   */
  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const isAuthenticated = !!user && !!localStorage.getItem('accessToken');

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    fetchCurrentUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Custom Hooks

### File: `src/hooks/useAuth.js`

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook to use auth context
 * Usage: const { user, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### File: `src/hooks/useApi.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

/**
 * Hook for fetching data
 * Usage: const { data, loading, error } = useApi('/users');
 */
export function useApi(endpoint, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!endpoint) {
          setData(null);
          setLoading(false);
          return;
        }

        const result = await apiClient(endpoint);
        
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [endpoint, ...dependencies]);

  return { data, loading, error };
}

/**
 * Hook for mutations (POST, PATCH, DELETE)
 * Usage:
 * const { execute, loading, error } = useMutation();
 * execute('/users', { method: 'POST', body: JSON.stringify(data) })
 */
export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (endpoint, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiClient(endpoint, {
        method: 'POST', // default
        ...options,
      });

      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

/**
 * Hook for GET with refetch capability
 */
export function useApiWithRefetch(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient(endpoint);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    refetch();
  }, [endpoint, refetch]);

  return { data, loading, error, refetch };
}
```

---

## Protected Routes

### File: `src/components/ProtectedRoute.jsx`

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './ui/LoadingSpinner';

/**
 * Route protection component
 * Usage: <ProtectedRoute element={<Dashboard />} requiredRole="admin" />
 */
export default function ProtectedRoute({ element, requiredRole = null }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return element;
}
```

### File: `src/components/ui/LoadingSpinner.jsx`

```javascript
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

---

## Example Pages

### File: `src/pages/auth/LoginPage.jsx`

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email dan password harus diisi');
      return;
    }

    try {
      setLoading(true);
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### File: `src/pages/users/UsersPage.jsx`

```javascript
import { useState } from 'react';
import { useApiWithRefetch, useMutation } from '../../hooks/useApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: users, loading, error, refetch } = useApiWithRefetch(
    `/users?skip=${page * limit}&limit=${limit}`
  );
  const { execute: deleteUser, loading: deleteLoading } = useMutation();

  const handleDelete = async (userId) => {
    if (window.confirm('Yakin ingin menghapus user ini?')) {
      try {
        await deleteUser(`/users/${userId}`, { method: 'DELETE' });
        refetch();
      } catch (err) {
        alert('Gagal menghapus user: ' + err.message);
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error.message}
        </div>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Email</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users?.map(user => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">{user.name}</td>
              <td className="border p-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {user.role}
                </span>
              </td>
              <td className="border p-2">
                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={deleteLoading}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2">Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!users || users.length < limit}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Services Pattern

### File: `src/services/userService.js`

```javascript
import { apiClient } from '../api/client';

/**
 * User service - Centralize all user-related API calls
 */
export const userService = {
  /**
   * Get all users
   */
  getAll: async (skip = 0, limit = 10, filters = {}) => {
    const params = new URLSearchParams({
      skip,
      limit,
      ...filters
    });
    return apiClient(`/users?${params}`);
  },

  /**
   * Get user by ID
   */
  getById: async (id) => {
    return apiClient(`/users/${id}`);
  },

  /**
   * Create user
   */
  create: async (userData) => {
    return apiClient('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  /**
   * Update user
   */
  update: async (id, updates) => {
    return apiClient(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Delete user
   */
  delete: async (id) => {
    return apiClient(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};
```

### File: `src/services/projectService.js`

```javascript
import { apiClient } from '../api/client';

export const projectService = {
  getAll: async (skip = 0, limit = 10, filters = {}) => {
    const params = new URLSearchParams({
      skip,
      limit,
      ...filters
    });
    return apiClient(`/projects?${params}`);
  },

  getById: async (id) => {
    return apiClient(`/projects/${id}`);
  },

  getStats: async (id) => {
    return apiClient(`/projects/${id}/stats`);
  },

  create: async (projectData) => {
    return apiClient('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },

  update: async (id, updates) => {
    return apiClient(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  delete: async (id) => {
    return apiClient(`/projects/${id}`, {
      method: 'DELETE'
    });
  }
};
```

---

## Usage Example

### File: `src/pages/dashboard/DashboardPage.jsx`

```javascript
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { projectService } from '../../services/projectService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await projectService.getAll(0, 5);
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Welcome, {user?.name}!
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats?.map(project => (
          <div key={project.id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-2">{project.name}</h3>
            <p className="text-gray-600">{project.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              Total Units: {project.totalUnits}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## App Setup

### File: `src/App.jsx`

```javascript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<DashboardPage />} />}
          />
          
          <Route
            path="/users"
            element={
              <ProtectedRoute
                element={<UsersPage />}
                requiredRole={['super_admin', 'admin']}
              />
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

---

## Notes

- Semua kode di atas adalah template & dapat disesuaikan dengan kebutuhan
- Ganti `localhost:3000` dengan production URL saat deploy
- Implementasikan error boundaries untuk production
- Tambahkan loading states & empty states untuk better UX
- Gunakan TypeScript untuk better type safety (optional)

Happy Coding! 🚀
