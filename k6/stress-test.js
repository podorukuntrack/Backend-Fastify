/**
 * K6 Stress Test - PodoRukunTrack API
 * 
 * Stress test yang ramping up dari 0 users ke peak load
 * dan kemudian spiking untuk test breaking point
 * 
 * Run: k6 run stress-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const requestDuration = new Trend('request_duration');
const requestCounter = new Counter('request_count');

// Test configuration
export const options = {
  // Scenario: Stress testing - gradually increase load until breaking point
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Ramp up to 10 users
        { duration: '1m', target: 25 },    // Ramp up to 25 users
        { duration: '2m', target: 50 },    // Ramp up to 50 users
        { duration: '2m', target: 100 },   // Ramp up to 100 users (stress)
        { duration: '1m', target: 200 },   // Spike to 200 users (breaking point test)
        { duration: '1m', target: 0 },     // Ramp down to 0
      ],
      gracefulRampDown: '10s',
      gracefulStop: '30s',
    },
  },
  
  // Thresholds - when test fails
  thresholds: {
    http_req_duration: ['p(99)<1500', 'p(95)<1000', 'p(90)<500'],  // 99% requests under 1.5s
    http_req_failed: ['rate<0.1'],  // Error rate under 10%
    'login_duration': ['p(95)<800'],  // 95% login under 800ms
    'errors': ['rate<0.05'],  // Error rate under 5%
  },

  ext: {
    loadimpact: {
      projectID: 3334215,
      name: 'PodoRukunTrack Stress Test'
    }
  }
};

// Constants
const BASE_URL = __ENV.BASE_URL || 'http://43.133.133.39/api/v1';
const TEST_EMAIL = 'super@admin.id';
const TEST_PASSWORD = '123456';

// Global variables to store auth token
let authToken = '';
let refreshToken = '';

/**
 * Setup: Login once for all VUs
 */
export function setup() {
  console.log('🔐 Setup: Logging in...');
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'setup login successful': (r) => r.status === 200,
  });

  const body = loginRes.json();
  
  if (body.success) {
    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken
    };
  } else {
    console.error('❌ Setup failed: Could not login');
    throw new Error('Login failed in setup');
  }
}

/**
 * Main test function
 */
export default function (data) {
  authToken = data.accessToken;
  refreshToken = data.refreshToken;

  // Group 1: Test GET requests (read-heavy)
  group('GET Requests - Read Operations', () => {
    // Get users list
    const usersRes = http.get(`${BASE_URL}/users?skip=0&limit=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    requestDuration.add(usersRes.timings.duration);
    requestCounter.add(1);

    check(usersRes, {
      'GET /users status 200': (r) => r.status === 200,
      'GET /users response time < 500ms': (r) => r.timings.duration < 500,
      'GET /users has data': (r) => r.json('data') !== null,
    });

    if (usersRes.status !== 200) {
      errorRate.add(1);
    }

    sleep(1);

    // Get projects list
    const projectsRes = http.get(`${BASE_URL}/projects?skip=0&limit=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    requestDuration.add(projectsRes.timings.duration);
    requestCounter.add(1);

    check(projectsRes, {
      'GET /projects status 200': (r) => r.status === 200,
      'GET /projects response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (projectsRes.status !== 200) {
      errorRate.add(1);
    }

    sleep(1);

    // Get units list
    const unitsRes = http.get(`${BASE_URL}/units?skip=0&limit=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    requestDuration.add(unitsRes.timings.duration);
    requestCounter.add(1);

    check(unitsRes, {
      'GET /units status 200': (r) => r.status === 200,
      'GET /units response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (unitsRes.status !== 200) {
      errorRate.add(1);
    }

    sleep(1);

    // Get dashboard
    const dashboardRes = http.get(`${BASE_URL}/dashboard/admin`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    requestDuration.add(dashboardRes.timings.duration);
    requestCounter.add(1);

    check(dashboardRes, {
      'GET /dashboard/admin status 200': (r) => r.status === 200,
      'GET /dashboard/admin response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    if (dashboardRes.status !== 200) {
      errorRate.add(1);
    }

    sleep(1);
  });

  // Group 2: Test POST requests (write operations) - Less frequent
  if (__VU % 5 === 0) {  // Only 20% of VUs do write operations
    group('POST Requests - Write Operations', () => {
      const timestamp = Date.now();
      
      // Create a new unit (simulated)
      const createUnitRes = http.post(`${BASE_URL}/units`, JSON.stringify({
        projectId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        unitCode: `STRESS-${timestamp}`,
        floor: Math.floor(Math.random() * 10),
        price: 500000000 + Math.random() * 100000000,
        size: 100 + Math.random() * 100,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Stress test unit'
      }), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      requestDuration.add(createUnitRes.timings.duration);
      requestCounter.add(1);

      check(createUnitRes, {
        'POST /units status 201 or 200': (r) => r.status === 201 || r.status === 200,
        'POST /units response time < 1000ms': (r) => r.timings.duration < 1000,
      });

      if (createUnitRes.status !== 201 && createUnitRes.status !== 200) {
        errorRate.add(1);
      }

      sleep(1);
    });
  }

  // Group 3: Test error scenarios
  group('Error Scenarios', () => {
    // Test with invalid token
    const invalidTokenRes = http.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': 'Bearer invalid_token',
      }
    });

    check(invalidTokenRes, {
      'Invalid token returns 401': (r) => r.status === 401,
    });

    sleep(1);

    // Test with missing auth
    const noAuthRes = http.get(`${BASE_URL}/users`);

    check(noAuthRes, {
      'Missing auth returns 401': (r) => r.status === 401,
    });

    sleep(1);
  });

  // Random sleep between requests
  sleep(Math.random() * 3);
}

/**
 * Teardown: Logout
 */
export function teardown(data) {
  console.log('🔓 Teardown: Logging out...');
  
  const logoutRes = http.post(`${BASE_URL}/auth/logout`, JSON.stringify({
    refreshToken: data.refreshToken
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(logoutRes, {
    'teardown logout successful': (r) => r.status === 200,
  });
}

/**
 * Handle teardown errors gracefully
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results.json': JSON.stringify(data),
  };
}

/**
 * Simple text summary function
 */
function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;
  let summary = '\n';

  summary += `${indent}✅ Requests: ${data.metrics.http_reqs?.value || 0}\n`;
  summary += `${indent}❌ Errors: ${data.metrics.http_req_failed?.value || 0}\n`;
  
  if (data.metrics.http_req_duration) {
    summary += `${indent}⏱️  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}⏱️  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}⏱️  P99 Duration: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  }

  return summary;
}
