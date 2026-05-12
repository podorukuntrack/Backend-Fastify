/**
 * K6 Smoke Test - PodoRukunTrack API
 * 
 * Quick sanity check untuk memastikan API berfungsi
 * Cocok untuk CI/CD pipeline
 * 
 * Run: k6 run smoke-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  vus: 1,  // Only 1 user
  duration: '30s',  // Short duration
  
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests under 500ms
    http_req_failed: ['rate<0.1'],  // Less than 10% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'testuser@smoke.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'password123';

/**
 * Setup - Login
 */
export function setup() {
  console.log('🧪 Smoke Test Started');
  console.log(`📍 Testing: ${BASE_URL}`);
  
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login status 200': (r) => r.status === 200,
  });

  const body = res.json();
  
  if (!body.success) {
    throw new Error(`❌ Login failed: ${body.message}`);
  }

  console.log('✅ Login successful');

  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken
  };
}

/**
 * Main smoke test - hit all critical endpoints
 */
export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.accessToken}`,
    'Content-Type': 'application/json'
  };

  // Test all critical endpoints
  const endpoints = [
    { method: 'GET', path: '/auth/me', name: 'Get Current User' },
    { method: 'GET', path: '/dashboard/admin', name: 'Dashboard' },
    { method: 'GET', path: '/users?skip=0&limit=5', name: 'Users List' },
    { method: 'GET', path: '/projects?skip=0&limit=5', name: 'Projects List' },
    { method: 'GET', path: '/units?skip=0&limit=5', name: 'Units List' },
    { method: 'GET', path: '/companies?skip=0&limit=5', name: 'Companies List' },
    { method: 'GET', path: '/tickets?skip=0&limit=5', name: 'Tickets List' },
    { method: 'GET', path: '/payments?skip=0&limit=5', name: 'Payments List' },
  ];

  group('Critical Endpoints', () => {
    endpoints.forEach(endpoint => {
      const res = http.get(`${BASE_URL}${endpoint.path}`, { headers });

      check(res, {
        [`${endpoint.name} status 200`]: (r) => r.status === 200,
        [`${endpoint.name} has data`]: (r) => {
          const body = r.json();
          return body && body.success === true;
        },
      });

      console.log(`✅ ${endpoint.name}: ${res.status}`);
      sleep(0.5);
    });
  });

  // Test error handling
  group('Error Scenarios', () => {
    // Test invalid ID
    const invalidRes = http.get(`${BASE_URL}/users/invalid-uuid`, { headers });
    
    check(invalidRes, {
      'Invalid UUID handled': (r) => r.status === 400 || r.status === 404,
    });

    console.log(`✅ Invalid UUID handled: ${invalidRes.status}`);
    sleep(0.5);

    // Test unauthorized access
    const unauthorizedRes = http.get(`${BASE_URL}/users`, {
      headers: { 'Authorization': 'Bearer invalid_token' }
    });

    check(unauthorizedRes, {
      'Invalid token returns 401': (r) => r.status === 401,
    });

    console.log(`✅ Invalid token handled: ${unauthorizedRes.status}`);
  });
}

/**
 * Teardown
 */
export function teardown(data) {
  console.log('👋 Smoke Test Completed');
  
  const res = http.post(`${BASE_URL}/auth/logout`, JSON.stringify({
    refreshToken: data.refreshToken
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'logout successful': (r) => r.status === 200,
  });
}
