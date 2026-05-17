/**
 * PodoRukunTrack — Stress Test Script
 * Jalankan: node test-stress.js [BASE_URL]
 * Contoh  : node test-stress.js https://api.podorukuntrack.com/api/v1
 */

const BASE_URL    = process.argv[2] || process.env.BASE_URL || 'http://localhost:3001/api/v1';
const EMAIL       = 'admin@majujaya.com';
const PASSWORD    = '12345678';

// ── Konfigurasi ──────────────────────────────────────────────────────────────
const CONFIG = {
  warmup:      10,   // request warmup sebelum test
  concurrent:  50,   // jumlah request concurrent per endpoint
  rounds:      3,    // berapa kali tiap endpoint di-hit dalam satu skenario
  thresholds: {
    p99:      3000,  // ms — batas P99 latency
    p95:      1500,  // ms — batas P95 latency
    avgMs:    1000,  // ms — batas rata-rata
    errorRate: 0.05, // 5% max error
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  magenta:(s) => `\x1b[35m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

let token = '';
const results = [];

function hdr(title) {
  console.log(`\n${c.bold(c.cyan(`▶  ${title}`))}`);
}

function bar(pct, width = 30) {
  const filled = Math.round((pct / 100) * width);
  const color = pct >= 99 ? 'green' : pct >= 90 ? 'yellow' : 'red';
  return c[color]('█'.repeat(filled)) + c.dim('░'.repeat(width - filled)) + ` ${pct.toFixed(1)}%`;
}

function pct(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * sorted.length)] ?? 0;
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const ms = performance.now() - start;
    let data;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.status < 400, status: res.status, ms, data };
  } catch (err) {
    const ms = performance.now() - start;
    return { ok: false, status: 0, ms, error: err.message };
  }
}

// Kirim N request concurrent ke satu endpoint
async function blast(label, method, path, body, n = CONFIG.concurrent, expectError = false) {
  const tasks = Array.from({ length: n }, () => req(method, path, body));
  const responses = await Promise.all(tasks);
  const latencies = responses.map(r => r.ms);
  const errors    = responses.filter(r => !r.ok).length;
  const errRate   = errors / n;
  const avg       = latencies.reduce((a, b) => a + b, 0) / n;
  const p95val    = pct(latencies, 95);
  const p99val    = pct(latencies, 99);
  const minMs     = Math.min(...latencies);
  const maxMs     = Math.max(...latencies);

  let pass;
  if (expectError) {
    // Untuk payload invalid: semua harus error (4xx), dan latency tetap cepat
    pass = errRate >= 0.95 && avg <= CONFIG.thresholds.avgMs;
  } else {
    pass = errRate <= CONFIG.thresholds.errorRate
      && avg    <= CONFIG.thresholds.avgMs
      && p95val <= CONFIG.thresholds.p95
      && p99val <= CONFIG.thresholds.p99;
  }

  results.push({ label, n, avg, p95: p95val, p99: p99val, min: minMs, max: maxMs, errors, errRate, pass });

  const errBadge = errors > 0
    ? (expectError ? c.green(` ✓ERR:${errors}`) : c.red(` ERR:${errors}`))
    : '';
  const icon = pass ? c.green('✓') : c.red('✗');

  console.log(
    ` ${icon} ${c.bold(label.padEnd(36))}` +
    ` avg:${c.yellow(avg.toFixed(0).padStart(5)+'ms')}` +
    ` p95:${c.yellow(p95val.toFixed(0).padStart(5)+'ms')}` +
    ` p99:${c.magenta(p99val.toFixed(0).padStart(5)+'ms')}` +
    ` [${minMs.toFixed(0)}-${maxMs.toFixed(0)}ms]` +
    errBadge
  );

  return { avg, p95: p95val, p99: p99val, errors, errRate };
}

// Kirim request berurutan (rounds kali) lalu ambil stats
async function sweep(label, method, path, body) {
  const all = [];
  for (let r = 0; r < CONFIG.rounds; r++) {
    const { avg } = await blast(`${label} (round ${r + 1})`, method, path, body, CONFIG.concurrent);
    all.push(avg);
    await new Promise(res => setTimeout(res, 100)); // jeda kecil antar round
  }
  const avgOfAvg = all.reduce((a, b) => a + b, 0) / all.length;
  console.log(c.dim(`   └─ avg-of-rounds: ${avgOfAvg.toFixed(0)}ms`));
}

// ── Login untuk dapat token ───────────────────────────────────────────────────
async function login() {
  hdr('LOGIN');
  const r = await req('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  if (!r.ok || !r.data?.data?.accessToken) {
    console.log(c.red('❌  Login gagal! Stress test dihentikan.'));
    console.log(c.dim(JSON.stringify(r.data).slice(0, 200)));
    process.exit(1);
  }
  token = r.data.data.accessToken;
  console.log(` ${c.green('✓')} Login berhasil (${r.ms.toFixed(0)}ms) — token didapat`);
}

// ── Discover: cari ID untuk dipakai dalam tes ─────────────────────────────────
async function discover() {
  const pRes = await req('GET', '/projects');
  const projectId = pRes.data?.data?.[0]?.id;

  const cRes = await req('GET', `/clusters?projectId=${projectId}`);
  const clusterId = cRes.data?.data?.[0]?.id;

  const uRes = await req('GET', `/units?clusterId=${clusterId}`);
  const unitId = uRes.data?.data?.[0]?.id;

  const hRes = await req('GET', `/handovers?unitId=${unitId}`);
  const handoverId = hRes.data?.data?.[0]?.id;

  console.log(c.dim(`   projectId : ${projectId}`));
  console.log(c.dim(`   clusterId : ${clusterId}`));
  console.log(c.dim(`   unitId    : ${unitId}`));
  console.log(c.dim(`   handoverId: ${handoverId ?? 'tidak ada'}`));

  return { projectId, clusterId, unitId, handoverId };
}

// ── Warmup ────────────────────────────────────────────────────────────────────
async function warmup() {
  hdr('WARMUP');
  for (let i = 0; i < CONFIG.warmup; i++) await req('GET', '/projects');
  console.log(c.dim(`   ${CONFIG.warmup} warmup requests selesai`));
}

// ── Skenario ──────────────────────────────────────────────────────────────────

async function scenarioAuth() {
  hdr(`SKENARIO: AUTH (${CONFIG.concurrent} concurrent)`);
  // Login valid: lebih toleran terhadap latency (bcrypt hash mahal)
  const saved = CONFIG.thresholds.avgMs;
  CONFIG.thresholds.avgMs = 1500;
  CONFIG.thresholds.p95   = 2000;
  CONFIG.thresholds.p99   = 2500;
  await blast('POST /auth/login [valid]',   'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  CONFIG.thresholds.avgMs = saved;
  CONFIG.thresholds.p95   = 1000;
  CONFIG.thresholds.p99   = 2000;
  await blast('POST /auth/login [invalid]', 'POST', '/auth/login', { email: 'x@x.com', password: 'wrong' }, CONFIG.concurrent, true);
}

async function scenarioRead({ projectId, clusterId, unitId }) {
  hdr(`SKENARIO: READ ENDPOINTS (${CONFIG.concurrent} concurrent × ${CONFIG.rounds} rounds)`);
  await sweep('GET /projects',                     'GET', '/projects');
  await sweep(`GET /clusters?projectId`,           'GET', `/clusters?projectId=${projectId}`);
  await sweep(`GET /units?clusterId`,              'GET', `/units?clusterId=${clusterId}`);
  await sweep('GET /assignments',                  'GET', '/assignments');
  await sweep('GET /progress',                     'GET', '/progress');
  await sweep(`GET /progress?unitId`,              'GET', `/progress?unitId=${unitId}`);
  await sweep('GET /timelines',                    'GET', '/timelines');
  await sweep(`GET /timelines?unitId`,             'GET', `/timelines?unitId=${unitId}`);
  await sweep('GET /handovers',                    'GET', '/handovers');
  await sweep(`GET /handovers?unitId`,             'GET', `/handovers?unitId=${unitId}`);
  await sweep('GET /retentions',                   'GET', '/retentions');
  await sweep(`GET /retentions?unitId`,            'GET', `/retentions?unitId=${unitId}`);
  await sweep('GET /documentations',               'GET', '/documentations');
  await sweep('GET /dashboard/stats',              'GET', '/dashboard/stats');
}

async function scenarioConcurrentUsers({ unitId }) {
  hdr('SKENARIO: CONCURRENT MIXED READERS (100 users simulasi)');
  const endpoints = [
    () => req('GET', '/projects'),
    () => req('GET', '/progress'),
    () => req('GET', '/timelines'),
    () => req('GET', `/handovers?unitId=${unitId}`),
    () => req('GET', '/dashboard/stats'),
    () => req('GET', '/assignments'),
    () => req('GET', '/retentions'),
    () => req('GET', '/documentations'),
  ];

  for (const N of [50, 100, 150]) {
    const tasks = Array.from({ length: N }, (_, i) => endpoints[i % endpoints.length]());
    const start = performance.now();
    const responses = await Promise.all(tasks);
    const totalMs = performance.now() - start;
    const latencies = responses.map(r => r.ms);
    const errors    = responses.filter(r => !r.ok).length;
    const throughput = (N / (totalMs / 1000)).toFixed(1);
    const p95v = pct(latencies, 95);
    const p99v = pct(latencies, 99);
    const pass = errors === 0 && p99v < CONFIG.thresholds.p99;
    const icon = pass ? c.green('✓') : c.red('✗');
    results.push({ label: `${N} concurrent mixed`, n: N, avg: pct(latencies, 50), p95: p95v, p99: p99v, errors, errRate: errors/N, pass });
    console.log(` ${icon} ${c.bold((N + ' users simulasi').padEnd(22))}  ${totalMs.toFixed(0).padStart(5)}ms total  throughput:${c.bold(throughput+' req/s').padStart(14)}  avg:${pct(latencies,50).toFixed(0)}ms  p95:${p95v.toFixed(0)}ms  p99:${p99v.toFixed(0)}ms  err:${errors}`);
    await new Promise(res => setTimeout(res, 300));
  }
}

async function scenarioSustainedLoad({ unitId }) {
  hdr('SKENARIO: SUSTAINED LOAD — 30 detik @ 50 concurrent');
  const durationMs = 30_000;
  const batchSize  = 50;
  const batchDelay = 500; // ms antar batch
  const allLatencies = [];
  let totalErrors = 0;
  let batches = 0;
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    const tasks = Array.from({ length: batchSize }, () => req('GET', `/handovers?unitId=${unitId}`));
    const responses = await Promise.all(tasks);
    responses.forEach(r => {
      allLatencies.push(r.ms);
      if (!r.ok) totalErrors++;
    });
    batches++;
    await new Promise(res => setTimeout(res, batchDelay));
  }

  const totalReqs  = batches * batchSize;
  const avgMs      = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
  const p95v       = pct(allLatencies, 95);
  const p99v       = pct(allLatencies, 99);
  const errRate    = totalErrors / totalReqs;
  const pass       = errRate <= CONFIG.thresholds.errorRate && p99v <= CONFIG.thresholds.p99;
  const icon       = pass ? c.green('✓') : c.red('✗');

  results.push({ label: 'sustained 30s @50 concurrent', n: totalReqs, avg: avgMs, p95: p95v, p99: p99v, errors: totalErrors, errRate, pass });
  console.log(` ${icon} ${batches} batch × ${batchSize} req = ${c.bold(totalReqs + ' total')}`);
  console.log(`   avg   : ${avgMs.toFixed(0)}ms`);
  console.log(`   p95   : ${p95v.toFixed(0)}ms`);
  console.log(`   p99   : ${p99v.toFixed(0)}ms`);
  console.log(`   errors: ${totalErrors === 0 ? c.green('0') : c.red(totalErrors)} (${(errRate*100).toFixed(2)}%)`);
}

async function scenarioSpike({ unitId }) {
  hdr('SKENARIO: SPIKE — ramp up 10 → 100 → 10 requests');
  for (const n of [10, 20, 50, 100, 200, 100, 50, 20, 10]) {
    const tasks = Array.from({ length: n }, () => req('GET', `/handovers?unitId=${unitId}`));
    const responses = await Promise.all(tasks);
    const latencies = responses.map(r => r.ms);
    const errors = responses.filter(r => !r.ok).length;
    const avg = latencies.reduce((a, b) => a + b, 0) / n;
    const p99val = pct(latencies, 99);
    const icon = errors === 0 ? c.green('✓') : c.red('✗');
    console.log(
      ` ${icon} n=${String(n).padStart(3)}  avg:${avg.toFixed(0).padStart(5)}ms  p99:${p99val.toFixed(0).padStart(5)}ms  errors:${errors}`
    );
    results.push({ label: `spike n=${n}`, n, avg, p95: pct(latencies,95), p99: p99val, errors, errRate: errors/n, pass: errors===0 && p99val < CONFIG.thresholds.p99 });
    await new Promise(res => setTimeout(res, 200));
  }
}

async function scenarioInvalidPayloads() {
  hdr('SKENARIO: INVALID PAYLOADS (keamanan validasi)');
  await blast('POST /auth/login [no body]',       'POST', '/auth/login',    {}, CONFIG.concurrent, true);
  await blast('PATCH /handovers/invalid-uuid',    'PATCH', '/handovers/not-a-uuid', { status: 'x' }, CONFIG.concurrent, true);
  await blast('POST /handovers [missing unitId]', 'POST', '/handovers',     { scheduledDate: new Date().toISOString() }, CONFIG.concurrent, true);
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
  const total   = results.length;
  const pass    = results.filter(r => r.pass).length;
  const fail    = total - pass;
  const allAvg  = results.map(r => r.avg);
  const globalP95 = pct(allAvg, 95);
  const globalP99 = pct(allAvg, 99);
  const totalErrors = results.reduce((s, r) => s + (r.errors || 0), 0);
  const totalReqs   = results.reduce((s, r) => s + (r.n || 0), 0);
  const globalErrRate = ((totalErrors / totalReqs) * 100).toFixed(2);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(c.bold('📊  STRESS TEST SUMMARY'));
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Skenario    : ${total} — ${c.green(pass + ' lulus')} / ${fail > 0 ? c.red(fail + ' gagal') : c.dim('0 gagal')}`);
  console.log(`  Total req   : ${totalReqs}`);
  console.log(`  Error rate  : ${parseFloat(globalErrRate) <= 5 ? c.green(globalErrRate + '%') : c.red(globalErrRate + '%')}  (threshold: ${CONFIG.thresholds.errorRate * 100}%)`);
  console.log(`  Global P95  : ${globalP95 <= CONFIG.thresholds.p95 ? c.green(globalP95.toFixed(0)+'ms') : c.red(globalP95.toFixed(0)+'ms')}  (threshold: ${CONFIG.thresholds.p95}ms)`);
  console.log(`  Global P99  : ${globalP99 <= CONFIG.thresholds.p99 ? c.green(globalP99.toFixed(0)+'ms') : c.red(globalP99.toFixed(0)+'ms')}  (threshold: ${CONFIG.thresholds.p99}ms)`);
  console.log(`${'─'.repeat(60)}`);

  // Tabel hasil per skenario
  const failed = results.filter(r => !r.pass);
  if (failed.length > 0) {
    console.log(c.red(c.bold('  ❌ Skenario yang gagal:')));
    for (const r of failed) {
      console.log(c.red(`     • ${r.label} — avg:${r.avg.toFixed(0)}ms p99:${r.p99.toFixed(0)}ms err:${((r.errRate||0)*100).toFixed(1)}%`));
    }
  }

  // Slowest 3
  const sorted = [...results].sort((a, b) => b.p99 - a.p99).slice(0, 3);
  console.log(c.yellow('\n  🐢 Top 3 Slowest (P99):'));
  for (const r of sorted) {
    console.log(`     ${r.p99.toFixed(0).padStart(6)}ms  ${r.label}`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  if (fail === 0 && parseFloat(globalErrRate) <= 5) {
    console.log(c.green(c.bold('  ✅ Server tahan terhadap beban yang diuji!')));
  } else {
    console.log(c.red(c.bold('  ⚠️  Ada threshold yang dilanggar — perlu optimasi.')));
  }
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(fail > 0 ? 1 : 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold('\n⚡  PodoRukunTrack — Stress Test'));
  console.log(c.dim(`   Target     : ${BASE_URL}`));
  console.log(c.dim(`   Concurrent : ${CONFIG.concurrent} req`));
  console.log(c.dim(`   Rounds     : ${CONFIG.rounds}`));
  console.log(c.dim(`   Thresholds : avg<${CONFIG.thresholds.avgMs}ms  p95<${CONFIG.thresholds.p95}ms  p99<${CONFIG.thresholds.p99}ms  err<${CONFIG.thresholds.errorRate*100}%`));

  await login();
  await warmup();

  hdr('DISCOVER IDs');
  const ids = await discover();

  await scenarioAuth();
  await scenarioRead(ids);
  await scenarioConcurrentUsers(ids);
  await scenarioSustainedLoad(ids);
  await scenarioSpike(ids);
  await scenarioInvalidPayloads();

  printSummary();
}

main().catch(err => {
  console.error(c.red('💥 Fatal error: ' + err.message));
  process.exit(1);
});
