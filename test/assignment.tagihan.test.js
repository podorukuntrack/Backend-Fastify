import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// database.js memuat .env dan membuka koneksi; tes route tidak boleh menyentuh database apa pun.
// db.execute menjawab public.si_billing_applies(); scope.inPilot mengatur hasilnya per tes.
const scope = { inPilot: true };
vi.mock('../src/config/database.js', () => ({ db: { execute: vi.fn(async () => [{ ok: scope.inPilot }]) }, client: vi.fn() }));
vi.mock('../src/modules/assignments/assignment.repository.js', async (importOriginal) => ({
  ...(await importOriginal()),
  findSiBills: vi.fn(),
}));

const { findSiBills } = await import('../src/modules/assignments/assignment.repository.js');
const { db } = await import('../src/config/database.js');
const { default: assignmentRoutes } = await import('../src/modules/assignments/assignment.routes.js');

const ASSIGNMENT_ID = '00000000-0000-4000-8000-000000000001';
const BILL = { id: '00000000-0000-4000-8000-000000000002', no_urut: 2, jumlah: '1000.00', realisasi: '0.00', sisa: '1000.00', aktif: true, sedang_diproses: false };

async function makeApp(role = 'admin') {
  const app = Fastify();
  app.decorate('authenticate', async (request) => { request.user = { sub: 'u1', role }; });
  await app.register(assignmentRoutes, { prefix: '/assignments' });
  return app;
}

describe('GET /assignments/:id/tagihan', () => {
  const original = process.env.SI_BILLING_ENABLED;
  beforeEach(() => { vi.mocked(findSiBills).mockReset(); vi.mocked(db.execute).mockClear(); scope.inPilot = true; });
  afterEach(() => {
    if (original === undefined) delete process.env.SI_BILLING_ENABLED;
    else process.env.SI_BILLING_ENABLED = original;
  });

  it('reports billing_enabled=true next to the bill array when SI billing is active', async () => {
    process.env.SI_BILLING_ENABLED = 'true';
    vi.mocked(findSiBills).mockResolvedValue([BILL]);
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, message: 'Success', data: [BILL], billing_enabled: true });
    expect(findSiBills).toHaveBeenCalledWith(ASSIGNMENT_ID, { sub: 'u1', role: 'admin' });
    await app.close();
  });

  it('distinguishes active billing without bills from disabled billing', async () => {
    vi.mocked(findSiBills).mockResolvedValue([]);
    const app = await makeApp();
    process.env.SI_BILLING_ENABLED = 'true';
    const active = (await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` })).json();
    process.env.SI_BILLING_ENABLED = 'false';
    const disabled = (await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` })).json();
    expect(active).toMatchObject({ data: [], billing_enabled: true });
    expect(disabled).toMatchObject({ data: [], billing_enabled: false });
    await app.close();
  });

  it('treats a missing or misspelled flag as disabled', async () => {
    vi.mocked(findSiBills).mockResolvedValue([]);
    const app = await makeApp();
    for (const value of [undefined, 'TRUE', '1', 'yes']) {
      if (value === undefined) delete process.env.SI_BILLING_ENABLED;
      else process.env.SI_BILLING_ENABLED = value;
      const res = await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` });
      expect(res.json().billing_enabled).toBe(false);
    }
    await app.close();
  });

  it('reports billing_enabled=false for assignments outside the pilot companies', async () => {
    process.env.SI_BILLING_ENABLED = 'true';
    scope.inPilot = false;
    vi.mocked(findSiBills).mockResolvedValue([]);
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` });
    expect(res.json()).toMatchObject({ data: [], billing_enabled: false });
    await app.close();
  });

  it('does not query the database scope while the env switch is off', async () => {
    process.env.SI_BILLING_ENABLED = 'false';
    vi.mocked(findSiBills).mockResolvedValue([]);
    const app = await makeApp();
    await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` });
    expect(db.execute).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 404 without the flag when the assignment is not accessible', async () => {
    process.env.SI_BILLING_ENABLED = 'true';
    vi.mocked(findSiBills).mockResolvedValue(null);
    const app = await makeApp('customer');
    const res = await app.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).not.toHaveProperty('billing_enabled');
    await app.close();
  });

  it('rejects roles outside the allowed list and invalid ids before querying', async () => {
    const contractor = await makeApp('kontraktor');
    expect((await contractor.inject({ method: 'GET', url: `/assignments/${ASSIGNMENT_ID}/tagihan` })).statusCode).toBe(403);
    await contractor.close();
    const admin = await makeApp();
    expect((await admin.inject({ method: 'GET', url: '/assignments/not-a-uuid/tagihan' })).statusCode).toBe(400);
    await admin.close();
    expect(findSiBills).not.toHaveBeenCalled();
  });
});
