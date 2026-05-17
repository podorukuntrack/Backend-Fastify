/**
 * PodoRukunTrack — API Test Script
 * Jalankan lokal  : node test-api.js
 * Jalankan produksi: BASE_URL=https://api.podorukuntrack.com/api node test-api.js
 *                    atau: node test-api.js https://api.podorukuntrack.com/api
 * Pastikan backend sudah running
 */

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'http://localhost:3001/api/v1';
const CREDENTIALS = { email: 'admin@majujaya.com', password: '12345678' };

let token = '';
let refreshToken = '';

// ─── helpers ──────────────────────────────────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red:   (s) => `\x1b[31m${s}\x1b[0m`,
  yellow:(s) => `\x1b[33m${s}\x1b[0m`,
  cyan:  (s) => `\x1b[36m${s}\x1b[0m`,
  bold:  (s) => `\x1b[1m${s}\x1b[0m`,
  dim:   (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0, failed = 0;

function header(title) {
  console.log(`\n${c.bold(c.cyan(`━━━  ${title}  ━━━`))}`);
}

async function req(method, path, body, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

function check(label, condition, hint = '') {
  if (condition) {
    console.log(` ${c.green('✓')} ${label}`);
    passed++;
  } else {
    console.log(` ${c.red('✗')} ${label}${hint ? c.dim('  — ' + hint) : ''}`);
    failed++;
  }
}

// ─── test blocks ──────────────────────────────────────────────────────────────

async function testAuth() {
  header('AUTH');

  // Login berhasil
  const r1 = await req('POST', '/auth/login', CREDENTIALS);
  check('Login dengan kredensial valid → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya accessToken', !!r1.data?.data?.accessToken, JSON.stringify(r1.data).slice(0, 100));
  if (r1.data?.data?.accessToken) {
    token = r1.data.data.accessToken;
    refreshToken = r1.data.data.refreshToken;
  }

  // Login gagal
  const r2 = await req('POST', '/auth/login', { email: 'salah@test.com', password: 'salah' });
  check('Login dengan kredensial salah → 401 atau 400', [400, 401, 403].includes(r2.status), `status: ${r2.status}`);

  // Akses tanpa token
  const r3 = await req('GET', '/projects');
  // sementara matikan token
  const savedToken = token; token = '';
  const r4 = await req('GET', '/projects');
  token = savedToken;
  check('Akses endpoint tanpa token → 401', r4.status === 401, `status: ${r4.status}`);
}

async function testProjects() {
  header('PROJECTS');

  const r1 = await req('GET', '/projects');
  check('GET /projects → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));
  return r1.data?.data?.[0]?.id;
}

async function testClusters(projectId) {
  header('CLUSTERS');
  if (!projectId) { console.log(c.yellow(' ⚠ Skip — tidak ada projectId')); return null; }

  const r1 = await req('GET', `/clusters?projectId=${projectId}`);
  check('GET /clusters → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));
  return r1.data?.data?.[0]?.id;
}

async function testUnits(clusterId) {
  header('UNITS');
  if (!clusterId) { console.log(c.yellow(' ⚠ Skip — tidak ada clusterId')); return null; }

  const r1 = await req('GET', `/units?clusterId=${clusterId}`);
  check('GET /units → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));
  return r1.data?.data?.[0]?.id;
}

async function testAssignments(unitId) {
  header('ASSIGNMENTS');

  const r1 = await req('GET', '/assignments');
  check('GET /assignments → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));
}

async function testProgress(unitId) {
  header('PROGRESS');

  const r1 = await req('GET', '/progress');
  check('GET /progress → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));

  if (unitId) {
    const r2 = await req('GET', `/progress?unitId=${unitId}`);
    check(`GET /progress?unitId= → 200`, r2.status === 200, `status: ${r2.status}`);
    check('Filter unitId bekerja — semua item punya unit_id sama', 
      (r2.data?.data || []).every(p => {
        const pid = p.unit_id ?? p.unitId;
        return !pid || String(pid) === String(unitId);
      }),
      'Ada item dengan unit_id berbeda!'
    );
  }
}

async function testTimelines(unitId) {
  header('TIMELINES');

  const r1 = await req('GET', '/timelines');
  check('GET /timelines → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));

  if (unitId) {
    const r2 = await req('GET', `/timelines?unitId=${unitId}`);
    check('GET /timelines?unitId= → 200', r2.status === 200, `status: ${r2.status}`);
    check('Filter unitId bekerja — semua item punya unitId sama',
      (r2.data?.data || []).every(t => {
        const tid = t.unit_id ?? t.unitId;
        return !tid || String(tid) === String(unitId);
      }),
      'Ada item dengan unitId berbeda!'
    );
  }
}

async function testHandovers(unitId) {
  header('HANDOVERS');

  const r1 = await req('GET', '/handovers');
  check('GET /handovers → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));

  if (unitId) {
    const r2 = await req('GET', `/handovers?unitId=${unitId}`);
    check('GET /handovers?unitId= → 200', r2.status === 200, `status: ${r2.status}`);
    check('Filter unitId bekerja — semua item punya unit_id sama',
      (r2.data?.data || []).every(h => {
        const hid = h.unit_id ?? h.unitId;
        return !hid || String(hid) === String(unitId);
      }),
      'Ada item dengan unit_id berbeda!'
    );

    // Cek field scheduled_date ada dan valid
    const handoverList = r2.data?.data || [];
    if (handoverList.length > 0) {
      const h = handoverList[0];
      const scheduledDate = h.scheduled_date ?? h.scheduledDate;
      const isValidDate = scheduledDate && !isNaN(new Date(scheduledDate).getTime());
      check('Field scheduled_date ada dan valid', isValidDate, `nilai: ${scheduledDate}`);
      check('Field status ada', !!h.status, `status: ${h.status}`);
    } else {
      console.log(c.dim('   (Tidak ada handover untuk unit ini — skip field checks)'));
    }
  }

  // Test PATCH update dengan body yang invalid
  const r3 = await req('PATCH', '/handovers/00000000-0000-0000-0000-000000000000', { status: 'invalid_status' });
  check('PATCH handover dengan status invalid → 400', r3.status === 400, `status: ${r3.status}`);
}

async function testRetentions(unitId) {
  header('RETENTIONS');

  const r1 = await req('GET', '/retentions');
  check('GET /retentions → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));

  if (unitId) {
    const r2 = await req('GET', `/retentions?unitId=${unitId}`);
    check('GET /retentions?unitId= → 200', r2.status === 200, `status: ${r2.status}`);
    check('Filter unitId bekerja',
      (r2.data?.data || []).every(r => {
        const rid = r.unit_id ?? r.unitId;
        return !rid || String(rid) === String(unitId);
      }),
      'Ada item dengan unitId berbeda!'
    );
  }
}

async function testDocumentations(unitId) {
  header('DOCUMENTATIONS');

  const r1 = await req('GET', '/documentations');
  check('GET /documentations → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));

  if (unitId) {
    const r2 = await req('GET', `/documentations?unitId=${unitId}`);
    check('GET /documentations?unitId= → 200', r2.status === 200, `status: ${r2.status}`);
  }
}

async function testDashboard() {
  header('DASHBOARD');

  const r1 = await req('GET', '/dashboard/stats');
  check('GET /dashboard/stats → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya data stats', !!r1.data?.data, JSON.stringify(r1.data).slice(0,100));
}

async function testUsers() {
  header('USERS');

  const r1 = await req('GET', '/users');
  check('GET /users → 200', r1.status === 200, `status: ${r1.status}`);
  check('Response punya array data', Array.isArray(r1.data?.data), JSON.stringify(r1.data).slice(0,80));
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold('\n🧪  PodoRukunTrack — Backend API Test'));
  console.log(c.dim(`   Target: ${BASE_URL}`));
  console.log(c.dim(`   Akun  : ${CREDENTIALS.email}\n`));

  try {
    await testAuth();

    if (!token) {
      console.log(c.red('\n❌ Login gagal, tes selanjutnya tidak dapat dijalankan.\n'));
      process.exit(1);
    }

    const projectId  = await testProjects();
    const clusterId  = await testClusters(projectId);
    const unitId     = await testUnits(clusterId);

    await testAssignments(unitId);
    await testProgress(unitId);
    await testTimelines(unitId);
    await testHandovers(unitId);
    await testRetentions(unitId);
    await testDocumentations(unitId);
    await testDashboard();
    await testUsers();

  } catch (err) {
    console.log(c.red(`\n💥 Error tidak terduga: ${err.message}`));
    console.error(err);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(c.bold('📊  Hasil:'));
  console.log(`   ${c.green(`✓ ${passed} passed`)}  ${failed > 0 ? c.red(`✗ ${failed} failed`) : c.dim('0 failed')}  / ${total} total`);
  if (failed === 0) {
    console.log(c.green(c.bold('\n   ✅ Semua tes lulus!')));
  } else {
    console.log(c.red(c.bold(`\n   ❌ ${failed} tes gagal — periksa output di atas.`)));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main();
