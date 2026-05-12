/**
 * K6 Soak Test - PodoRukunTrack API
 * 
 * Long-running test dengan steady load
 * Ideal untuk mendeteksi memory leaks, connection pool issues, dll
 * 
 * Run: k6 run soak-test.js
 * 
 * Note: This runs for 30 minutes - bisa diubah di options.duration
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 20,  // 20 concurrent users
      duration: '30m',  // 30 minute soak test
    },
  },

  thresholds: {
    http_req_duration: ['p(99)<2000', 'p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    'errors': ['rate<0.05'],
  },

  // Batch requests for better simulation
  batch: 10,
  batchPerHost: 10,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'testuser@soak.com';
const TEST_PASSWORD = 'password123';

let authToken = '';

export function setup() {
  console.log('🔋 Soak Test Started - 30 minute duration');
  console.log(`📍 Target: ${BASE_URL}`);
  
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login successful': (r) => r.status === 200,
  });

  return {
    accessToken: res.json().data.accessToken,
    refreshToken: res.json().data.refreshToken
  };
}

export default function (data) {
  authToken = data.accessToken;

  // Realistic user behavior pattern
  group('User Activity Pattern', () => {
    // Browse dashboard
    let res = http.get(`${BASE_URL}/dashboard/admin`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'dashboard status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(3);

    // View projects
    res = http.get(`${BASE_URL}/projects?skip=0&limit=20`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'projects status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(2);

    // View specific project details
    res = http.get(`${BASE_URL}/projects/550e8400-e29b-41d4-a716-446655440000`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'project detail status 200 or 404': (r) => r.status === 200 || r.status === 404,
    });

    if (res.status !== 200 && res.status !== 404) {
      errorRate.add(1);
    }

    sleep(2);

    // View units in project
    res = http.get(`${BASE_URL}/units?skip=0&limit=20&status=available`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'units status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(2);

    // View tickets
    res = http.get(`${BASE_URL}/tickets?skip=0&limit=20`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'tickets status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(3);
  });

  // Admin actions - every 3rd VU
  if (__VU % 3 === 0) {
    group('Admin Operations', () => {
      let res = http.get(`${BASE_URL}/users?skip=0&limit=20`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      requestDuration.add(res.timings.duration);
      check(res, {
        'admin users status 200': (r) => r.status === 200,
      }) || errorRate.add(1);

      sleep(2);

      // View payments
      res = http.get(`${BASE_URL}/payments?skip=0&limit=20`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      requestDuration.add(res.timings.duration);
      check(res, {
        'payments status 200': (r) => r.status === 200,
      }) || errorRate.add(1);

      sleep(2);
    });
  }

  // Think time
  sleep(Math.random() * 5);
}

export function teardown(data) {
  console.log('✅ Soak Test Completed');
  
  http.post(`${BASE_URL}/auth/logout`, JSON.stringify({
    refreshToken: data.refreshToken
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
