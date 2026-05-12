/**
 * K6 Spike Test - PodoRukunTrack API
 * 
 * Test sudden traffic spike
 * Ideal untuk memastikan API bisa handle sudden increase in load
 * 
 * Run: k6 run spike-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },   // Warm up
        { duration: '1m', target: 10 },    // Stay at 10
        { duration: '10s', target: 250 },  // SPIKE! Sudden jump to 250
        { duration: '1m', target: 250 },   // Hold at 250
        { duration: '30s', target: 0 },    // Cool down
      ],
    },
  },

  thresholds: {
    http_req_duration: ['p(99)<2000', 'p(95)<1500'],
    http_req_failed: ['rate<0.2'],  // Allow 20% failure during spike
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'testuser@spike.com';
const TEST_PASSWORD = 'password123';

let authToken = '';

export function setup() {
  console.log('⚡ Spike Test Started');
  
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

  group('Heavy Load Operations', () => {
    // Simulate various operations during spike
    
    // 1. GET users
    let res = http.get(`${BASE_URL}/users?skip=0&limit=50`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.5);

    // 2. GET projects
    res = http.get(`${BASE_URL}/projects?skip=0&limit=50`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.5);

    // 3. GET units
    res = http.get(`${BASE_URL}/units?skip=0&limit=50`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.5);

    // 4. GET dashboard (complex query)
    res = http.get(`${BASE_URL}/dashboard/admin`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '30s',
    });

    requestDuration.add(res.timings.duration);
    check(res, {
      'status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.5);
  });

  sleep(Math.random() * 1);
}

export function teardown(data) {
  console.log('✅ Spike Test Completed');
  
  http.post(`${BASE_URL}/auth/logout`, JSON.stringify({
    refreshToken: data.refreshToken
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
