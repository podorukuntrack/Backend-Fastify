# K6 Performance Testing - PodoRukunTrack API

Comprehensive load testing, stress testing, dan performance testing suite untuk PodoRukunTrack API menggunakan K6.

---

## Table of Contents

1. [Installation](#installation)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Environment Variables](#environment-variables)
5. [Interpreting Results](#interpreting-results)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)

---

## Installation

### Prerequisites

- Windows, macOS, or Linux
- Administrator/sudo access

### Install K6

**Windows:**
```bash
# Using Chocolatey
choco install k6

# Or download from https://k6.io/docs/get-started/installation/
```

**macOS:**
```bash
brew install k6
```

**Linux (Ubuntu/Debian):**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y apt-transport-https
sudo add-apt-repository "deb https://dl.k6.io/deb stable main"
sudo apt-get update
sudo apt-get install k6
```

**Docker (Alternative):**
```bash
docker pull grafana/k6:latest
```

### Verify Installation

```bash
k6 version
# Output: k6 v0.47.0
```

---

## Test Types

### 1. **Smoke Test** (smoke-test.js)

**Tujuan**: Quick sanity check - test apakah API basic functionality bekerja

**Karakteristik**:
- Duration: 30 seconds
- VUs: 1 concurrent user
- Endpoints: 8+ critical endpoints
- Thresholds: Ketat (p95 < 500ms)

**Kapan Digunakan**:
- Before setiap load test
- CI/CD pipeline
- Quick validation sebelum deployment
- Smoke testing sebelum production

**Target**: ✅ Semua endpoint harus response dalam 500ms

---

### 2. **Load Test** (load-test.js)

**Tujuan**: Test API dengan sustained constant load selama 5 menit

**Karakteristik**:
- Duration: 5 minutes
- VUs: 50 concurrent users (constant)
- Scenarios: Realistic user journeys
- Thresholds: p95 < 1000ms, error rate < 5%

**Kapan Digunakan**:
- Test normal production load
- Capacity planning
- Regular performance monitoring
- Baseline performance metrics

**Target**: API harus handle 50 concurrent users dengan baik

---

### 3. **Stress Test** (stress-test.js)

**Tujuan**: Gradually increase load sampai API breaking point

**Karakteristik**:
- Duration: ~8 minutes
- VUs: Ramp dari 0 ke 200 VUs (spike)
- Stages:
  - 0-10 VUs (30s)
  - 10-25 VUs (1m)
  - 25-50 VUs (2m)
  - 50-100 VUs (2m)
  - 100-200 VUs (1m spike)

**Kapan Digunakan**:
- Find breaking point
- Capacity planning
- Performance optimization
- During development untuk identify bottlenecks

**Target**: Identify at what load API starts degrading

---

### 4. **Spike Test** (spike-test.js)

**Tujuan**: Test sudden traffic spike dari 10 ke 250 concurrent users

**Karakteristik**:
- Duration: ~3.5 minutes
- VUs: Sudden jump 10 → 250
- Hold time: 1 minute at peak
- Allow higher error rate: 20%

**Kapan Digunakan**:
- Test flash sale scenarios
- Marketing campaign spikes
- Viral content handling
- Emergency traffic scenarios

**Target**: Graceful degradation, tidak crash

---

### 5. **Soak Test** (soak-test.js)

**Tujuan**: Long-running test 30 menit dengan steady load 20 VUs

**Karakteristik**:
- Duration: 30 minutes (bisa dikurangi)
- VUs: 20 concurrent users (steady)
- Find: Memory leaks, connection pool issues
- Realistic user behavior

**Kapan Digunakan**:
- Night time testing
- Before production deployment
- Find memory/resource leaks
- Long-running stability testing

**Target**: No degradation over 30 minutes

---

## Running Tests

### Quick Start

```bash
# Navigate to k6 folder
cd fastify/k6

# Run smoke test (fastest, ~30 seconds)
k6 run smoke-test.js

# Run load test (5 minutes)
k6 run load-test.js

# Run stress test (8 minutes)
k6 run stress-test.js

# Run spike test (3.5 minutes)
k6 run spike-test.js

# Run soak test (30 minutes)
k6 run soak-test.js
```

### Custom API URL

```bash
# Test against different environment
k6 run smoke-test.js --env BASE_URL=https://api.example.com/api/v1

# With credentials
k6 run smoke-test.js \
  --env BASE_URL=https://api.example.com/api/v1 \
  --env TEST_EMAIL=admin@example.com \
  --env TEST_PASSWORD=password123
```

### With Output Options

```bash
# Run test dan generate JSON report
k6 run smoke-test.js -o json=results.json

# Run dengan verbose output
k6 run smoke-test.js -v

# Run dengan summary output
k6 run smoke-test.js --summary-export=summary.json
```

### Run Multiple Tests Sequentially

```bash
# Smoke → Load → Stress
bash -c "k6 run smoke-test.js && k6 run load-test.js && k6 run stress-test.js"

# Or create batch script (run-all-tests.sh)
```

### Docker Execution

```bash
# Run dalam Docker
docker run -i grafana/k6 run - <smoke-test.js

# Or with volume mount
docker run -v $(pwd):/scripts grafana/k6 run /scripts/smoke-test.js
```

---

## Environment Variables

### Standard Variables

```bash
# API URL
BASE_URL=http://localhost:3000/api/v1

# Test credentials
TEST_EMAIL=testuser@example.com
TEST_PASSWORD=password123

# For K6 Cloud
K6_CLOUD_TOKEN=your_token_here
```

### Create .env File

**File: k6/.env**
```bash
BASE_URL=http://localhost:3000/api/v1
TEST_EMAIL=admin@proptrack.com
TEST_PASSWORD=password123
```

### Load from .env

```bash
# Load environment variables (Linux/macOS)
export $(cat .env | grep -v '#' | xargs)
k6 run smoke-test.js

# Windows PowerShell
Get-Content .env | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}
k6 run smoke-test.js
```

---

## Interpreting Results

### Console Output Example

```
     checks........................ 100% ✓ 848  ✗ 0
     data_received..............: 2.3 MB
     data_sent................... 1.1 MB
     http_req_blocked............ avg=1.23ms    min=0.1ms    med=0.5ms    max=45.3ms   p(90)=2.1ms  p(95)=3.2ms
     http_req_connecting......... avg=0.5ms     min=0ms      med=0ms      max=20.1ms   p(90)=0ms    p(95)=0.1ms
     http_req_duration........... avg=234ms     min=50ms     med=180ms    max=1200ms   p(90)=450ms  p(95)=580ms
     http_req_failed............ 0.1%         ✗ 1   ✓ 847
     http_req_receiving......... avg=24ms      min=1ms      med=20ms     max=100ms    p(90)=50ms   p(95)=75ms
     http_req_sending.......... avg=12ms      min=0.5ms    med=10ms     max=80ms     p(90)=25ms   p(95)=35ms
     http_req_tls_handshaking.. avg=0ms       min=0ms      med=0ms      max=0ms      p(90)=0ms    p(95)=0ms
     http_req_waiting........... avg=198ms     min=40ms     med=150ms    max=1100ms   p(90)=400ms  p(95)=520ms
     http_reqs................... 848          9.35/s
     iteration_duration......... avg=25.2s     min=20.1s    med=25.1s    max=30.2s    p(90)=26.5s  p(95)=27.8s
     iterations................. 30           0.33/s
     vus........................ 50
     vus_max.................... 50
```

### Key Metrics Explained

| Metric | What It Means | Good Value |
|--------|--------------|------------|
| **http_req_duration** | Total request time | p(95) < 1000ms |
| **http_req_failed** | % of failed requests | < 5% |
| **http_reqs** | Total requests sent | Higher = better throughput |
| **http_req_waiting** | Time waiting for response | p(95) < 800ms |
| **vus_max** | Peak concurrent users | Match your scenario |
| **iterations** | Complete test cycles | More = better data |
| **checks** | Assertion pass rate | 100% is ideal |

### Thresholds Failed Example

```
FAILED: ...
    ✗ http_req_duration: p(99)<1500 exceeded
    ✗ http_req_failed: rate<0.1 exceeded
    ✓ login_duration: p(95)<800
    ✓ errors: rate<0.05
```

**Apa yang berarti**: 
- 99% of requests exceeding 1.5 seconds
- More than 10% requests failing
- Need to optimize backend atau add more resources

---

## Results Output

### JSON Report

```bash
k6 run stress-test.js -o json=results.json
```

**Results Format:**
```json
{
  "type": "Point",
  "metric": "http_req_duration",
  "data": {
    "value": 234,
    "tags": {
      "expected_response": "true",
      "group": "GET Requests - Read Operations",
      "method": "GET",
      "name": "http://localhost:3000/api/v1/users?skip=0&limit=10",
      "status": "200",
      "url": "http://localhost:3000/api/v1/users?skip=0&limit=10"
    }
  },
  "time": "2024-01-15T10:30:45.123Z"
}
```

### Summary Export

```bash
k6 run stress-test.js --summary-export=summary.json
```

---

## Best Practices

### 1. **Progressive Testing**

```
Smoke Test (quick)
    ↓
Load Test (sustained)
    ↓
Stress Test (breaking point)
    ↓
Soak Test (long-running)
```

### 2. **Test Realistic Scenarios**

```javascript
// ✅ Good - Mix of operations
group('User Journey', () => {
  // Read operation (80%)
  http.get('/users');
  sleep(2);
  
  // Write operation (20%)
  if (__VU % 5 === 0) {
    http.post('/users', data);
  }
});

// ❌ Bad - Only GET requests
http.get('/users');
http.get('/users');
http.get('/users');
```

### 3. **Use Think Time**

```javascript
// ✅ Good - Realistic with think time
http.get('/users');
sleep(2);  // User think time
http.get('/projects');
sleep(1);

// ❌ Bad - Rapid fire
http.get('/users');
http.get('/projects');
http.get('/tickets');
```

### 4. **Setup Authentication Properly**

```javascript
// ✅ Good - Setup once
export function setup() {
  // Login once
  return { accessToken: token };
}

export default function(data) {
  // Reuse token across all iterations
  http.get('/users', {
    headers: { 'Authorization': `Bearer ${data.accessToken}` }
  });
}

// ❌ Bad - Login every request
export default function() {
  http.post('/auth/login', ...);  // Wasteful
  http.get('/users', ...);
}
```

### 5. **Monitor Resource Usage**

Jalankan test sambil monitor backend:

```bash
# Terminal 1: Run k6 test
k6 run load-test.js

# Terminal 2: Monitor backend
# Linux:
watch -n 1 'top -p $(pgrep -f "node.*server")'

# macOS:
top -p $(pgrep -f "node.*server")

# Windows:
# Use Task Manager atau Process Explorer
```

### 6. **Analyze Results**

```bash
# Compare two runs
k6 run load-test.js -o json=run1.json
k6 run load-test.js -o json=run2.json

# Use script to compare
node compare-results.js run1.json run2.json
```

---

## Common Issues & Solutions

### Issue: "Connection refused"

```
ERROR: Connection refused (dial: tcp: lookup xxx)
```

**Solution**:
```bash
# Ensure backend is running
npm run dev  # in fastify folder

# Verify API is accessible
curl http://localhost:3000/api/v1/health

# Check BASE_URL
k6 run smoke-test.js --env BASE_URL=http://localhost:3000/api/v1
```

---

### Issue: "Authentication failed"

```
❌ setup login successful: false
```

**Solution**:
```bash
# Verify test credentials exist
# Check TEST_EMAIL dan TEST_PASSWORD di .env

# Create test user if needed
# In backend, run: node seedsuperadmin.js

# Verify credentials
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"your@email.com","password":"password"}'
```

---

### Issue: "Too many open files"

```
fork/exec /bin/sh: too many open files in system
```

**Solution**:
```bash
# Increase file descriptor limit
ulimit -n 65536

# Then run test
k6 run stress-test.js
```

---

### Issue: "Memory exceeded" or OOM

```
Cannot allocate memory
```

**Solution**:
```bash
# Reduce VUs or duration
# Edit test file:
# stages: [
#   { duration: '15s', target: 50 },  // Reduce from 200
# ]

# Or increase system swap
```

---

### Issue: "p(99) threshold exceeded"

```
FAILED: http_req_duration: p(99)<1500 exceeded
```

**Solution**:
```bash
# 1. Optimize backend (database queries, caching)
# 2. Increase resource allocation
# 3. Check for network issues
# 4. Reduce concurrent users
# 5. Adjust threshold jika diperlukan:

thresholds: {
  http_req_duration: ['p(99)<2000'],  // Relax dari 1500
}
```

---

## CI/CD Integration

### GitHub Actions

**File: .github/workflows/load-test.yml**

```yaml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start Backend
        run: |
          cd fastify
          npm install
          npm start &
          sleep 10  # Wait for backend to start
      
      - name: Run Smoke Test
        run: cd fastify/k6 && k6 run smoke-test.js
      
      - name: Run Load Test
        run: cd fastify/k6 && k6 run load-test.js
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: fastify/k6/results.json
```

### GitLab CI

**File: .gitlab-ci.yml**

```yaml
load_test:
  image: grafana/k6:latest
  script:
    - k6 run fastify/k6/smoke-test.js
    - k6 run fastify/k6/load-test.js
  artifacts:
    paths:
      - fastify/k6/results.json
  only:
    - main
  allow_failure: false
```

---

## Performance Optimization Tips

### Backend Optimization

1. **Add Database Indexing**
```sql
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_units_project ON units(project_id);
CREATE INDEX idx_users_company ON users(company_id);
```

2. **Implement Caching**
```javascript
// Cache frequently accessed data
const cache = new Map();

export async function getCachedUsers(skip, limit) {
  const key = `users:${skip}:${limit}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await getUsers(skip, limit);
  cache.set(key, data);
  
  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return data;
}
```

3. **Use Connection Pooling**
```javascript
// PostgreSQL pool configuration
const pool = new Pool({
  max: 20,  // Max connections
  min: 5,   // Min connections
  idleTimeoutMillis: 30000,
});
```

4. **Implement Rate Limiting**
```javascript
// Prevent abuse during load test
fastify.register(require('@fastify/rate-limit'), {
  max: 100,  // 100 requests
  timeWindow: '1 minute'
});
```

### Frontend Optimization

1. **Parallel Requests**
```javascript
// Make multiple requests in parallel
Promise.all([
  fetch('/api/users'),
  fetch('/api/projects'),
  fetch('/api/units')
]);
```

2. **Batch Requests**
```javascript
// Combine multiple operations
fetch('/api/batch', {
  method: 'POST',
  body: JSON.stringify({
    requests: [
      { path: '/users', method: 'GET' },
      { path: '/projects', method: 'GET' }
    ]
  })
});
```

---

## Quick Reference Commands

```bash
# Run test
k6 run <test-file>.js

# With custom URL
k6 run <test-file>.js --env BASE_URL=https://api.example.com

# Output JSON
k6 run <test-file>.js -o json=results.json

# Verbose output
k6 run <test-file>.js -v

# Run locally
k6 run <test-file>.js --local

# List all test files
ls *.js

# Create new test
touch new-test.js
```

---

## Recommended Testing Sequence

```bash
# 1. Smoke Test (sanity check)
k6 run smoke-test.js

# 2. If passed, run Load Test
k6 run load-test.js

# 3. If load test OK, run Stress Test
k6 run stress-test.js

# 4. Analyze results
# - Check if thresholds passed
# - Identify slow endpoints
# - Plan optimizations

# 5. Before deployment, run Soak Test
k6 run soak-test.js

# 6. Compare with previous runs
```

---

## Useful Resources

- [K6 Official Docs](https://k6.io/docs/)
- [K6 JavaScript API](https://k6.io/docs/javascript-api/)
- [K6 Best Practices](https://k6.io/docs/testing-guides/load-testing/)
- [K6 GitHub](https://github.com/grafana/k6)

---

## Summary

- **Smoke Test** - Quick validation (use before every deployment)
- **Load Test** - Normal production load (regular monitoring)
- **Stress Test** - Find breaking point (capacity planning)
- **Spike Test** - Sudden traffic surge (flash sales)
- **Soak Test** - Long-running stability (overnight testing)

Gunakan sesuai kebutuhan dan setup test suite di CI/CD pipeline untuk continuous monitoring! 🚀
