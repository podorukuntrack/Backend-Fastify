/**
 * K6 Load Test - PodoRukunTrack API
 * 
 * Load test yang mempertahankan constant load untuk periode lama
 * untuk mengecek performa API di kondisi normal/tinggi
 * 
 * Run: k6 run load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

// Test configuration
export const options = {
  scenarios: {
    load: {
      executor: 'constant-vus',
      vus: 50,  // Constant 50 concurrent users
      duration: '5m',  // Run for 5 minutes
      gracefulStop: '30s',
    },
  },

  thresholds: {
    http_req_duration: ['p(99)<2000', 'p(95)<1000', 'p(90)<500'],
    http_req_failed: ['rate<0.05'],  // Accept 5% error rate for load test
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://43.133.133.39/api/v1';
const TEST_EMAIL = 'super@admin.id';
const TEST_PASSWORD = '123456';

let authToken = '';
let refreshToken = '';

/**
 * Setup
 */
export function setup() {
  console.log('🔐 Setup: Authenticating...');
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const body = loginRes.json();
  
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken
  };
}

/**
 * Main test function - simulates realistic user behavior
 */
export default function (data) {
  authToken = data.accessToken;

  // User journey: Browse dashboard → View projects → View units
  group('User Dashboard Flow', () => {
    // 1. Get dashboard
    let res = http.get(`${BASE_URL}/dashboard/admin`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);

    check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard response < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(2);

    // 2. Browse projects
    res = http.get(`${BASE_URL}/projects?skip=0&limit=20`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);

    check(res, {
      'projects status 200': (r) => r.status === 200,
      'projects response < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(2);

    // 3. Browse units
    res = http.get(`${BASE_URL}/units?skip=0&limit=20&status=available`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);

    check(res, {
      'units status 200': (r) => r.status === 200,
      'units response < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(2);
  });

  // Admin journey: View users and tickets
  if (__VU % 3 === 0) {
    group('Admin Management Flow', () => {
      // Get users
      let res = http.get(`${BASE_URL}/users?skip=0&limit=20`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: '30s',
      });

      requestDuration.add(res.timings.duration);

      check(res, {
        'users status 200': (r) => r.status === 200,
      }) || errorRate.add(1);

      sleep(1);

      // Get tickets
      res = http.get(`${BASE_URL}/tickets?skip=0&limit=20&status=open`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: '30s',
      });

      requestDuration.add(res.timings.duration);

      check(res, {
        'tickets status 200': (r) => r.status === 200,
      }) || errorRate.add(1);

      sleep(1);
    });
  }

  // Support journey: View and resolve tickets
  if (__VU % 4 === 0) {
    group('Support Agent Flow', () => {
      const res = http.get(`${BASE_URL}/tickets?skip=0&limit=20`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: '30s',
      });

      requestDuration.add(res.timings.duration);

      check(res, {
        'support tickets status 200': (r) => r.status === 200,
      }) || errorRate.add(1);

      sleep(2);
    });
  }

  // Random think time
  sleep(Math.random() * 2);
}

/**
 * Teardown
 */
export function teardown(data) {
  console.log('🔓 Teardown: Logging out...');
  
  http.post(`${BASE_URL}/auth/logout`, JSON.stringify({
    refreshToken: data.refreshToken
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
