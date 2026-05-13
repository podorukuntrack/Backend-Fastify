import { db } from '../../config/database.js';
import { units, clusters, projects } from '../../shared/schemas/schema.js';
import { eq, and, ilike } from 'drizzle-orm';

// Kolom unit yang dipilih (tanpa JOIN)
const unitColumns = {
  id: units.id,
  clusterId: units.clusterId,
  nomorUnit: units.nomorUnit,
  tipeRumah: units.tipeRumah,
  luasTanah: units.luasTanah,
  luasBangunan: units.luasBangunan,
  statusPembangunan: units.statusPembangunan,
  progressPercentage: units.progressPercentage,
  createdAt: units.createdAt,
  updatedAt: units.updatedAt,
};

export const findAllUnits = async (userContext, filters = {}) => {
  const { page = 1, limit = 20, clusterId, statusPembangunan, search } = filters;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = [];
  if (clusterId) conditions.push(eq(units.clusterId, clusterId));
  if (statusPembangunan) conditions.push(eq(units.statusPembangunan, statusPembangunan));
  if (search) conditions.push(ilike(units.nomorUnit, `%${search}%`));

  // Admin: JOIN ke clusters untuk filter company
  if (userContext.role === 'admin') {
    const adminConditions = [
      eq(clusters.companyId, userContext.companyId),
      ...conditions,
    ];
    return await db
      .select(unitColumns)
      .from(units)
      .innerJoin(clusters, eq(units.clusterId, clusters.id))
      .where(and(...adminConditions))
      .limit(Number(limit))
      .offset(offset);
  }

  // super_admin: akses semua
  return await db
    .select(unitColumns)
    .from(units)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(Number(limit))
    .offset(offset);
};

export const findUnitById = async (id, userContext) => {
  if (userContext.role === 'admin') {
    const result = await db
      .select({
        id: units.id,
        clusterId: units.clusterId,
        nomorUnit: units.nomorUnit,
        tipeRumah: units.tipeRumah,
        luasTanah: units.luasTanah,
        luasBangunan: units.luasBangunan,
        statusPembangunan: units.statusPembangunan,
        progressPercentage: units.progressPercentage,
        createdAt: units.createdAt,
        updatedAt: units.updatedAt,
      })
      .from(units)
      .innerJoin(clusters, eq(units.clusterId, clusters.id))
      .where(and(eq(units.id, id), eq(clusters.companyId, userContext.companyId)))
      .limit(1);
    return result[0] ?? null;
  }

  const result = await db
    .select()
    .from(units)
    .where(eq(units.id, id))
    .limit(1);
  return result[0] ?? null;
};

export const findUnitDetailById = async (id, userContext) => {
  const conditions = [eq(units.id, id)];
  if (userContext.role === 'admin') {
    conditions.push(eq(clusters.companyId, userContext.companyId));
  }

  const result = await db
    .select({
      id: units.id,
      nomorUnit: units.nomorUnit,
      tipeRumah: units.tipeRumah,
      luasTanah: units.luasTanah,
      luasBangunan: units.luasBangunan,
      statusPembangunan: units.statusPembangunan,
      progressPercentage: units.progressPercentage,
      createdAt: units.createdAt,
      updatedAt: units.updatedAt,
      cluster: {
        id: clusters.id,
        namaCluster: clusters.namaCluster,
        jumlahUnit: clusters.jumlahUnit,
      },
      project: {
        id: projects.id,
        namaProyek: projects.namaProyek,
        lokasi: projects.lokasi,
        status: projects.status,
      },
    })
    .from(units)
    .innerJoin(clusters, eq(units.clusterId, clusters.id))
    .innerJoin(projects, eq(clusters.projectId, projects.id))
    .where(and(...conditions))
    .limit(1);

  return result[0] ?? null;
};

export const insertUnit = async (data) => {
  console.log('Processing single unit data:', data);
  
  const value = {
    clusterId: String(data.clusterId),
    nomorUnit: String(data.nomorUnit).trim(),
    tipeRumah: String(data.tipeRumah).trim(),
    statusPembangunan: String(data.statusPembangunan || 'planned'),
    progressPercentage: parseInt(data.progressPercentage ?? 0, 10),
  };

  // Handle numeric fields with null
  if (data.luasTanah !== undefined && data.luasTanah !== null) {
    const ltVal = parseFloat(data.luasTanah);
    value.luasTanah = isNaN(ltVal) ? null : ltVal;
  }
  if (data.luasBangunan !== undefined && data.luasBangunan !== null) {
    const lbVal = parseFloat(data.luasBangunan);
    value.luasBangunan = isNaN(lbVal) ? null : lbVal;
  }

  console.log('Final value object:', value);

  const result = await db
    .insert(units)
    .values(value)
    .returning();
  
  console.log('Insert result:', result);
  return result[0];
};

export const insertUnits = async (unitsData) => {
  const values = unitsData.map((data) => {
    console.log('Processing unit data:', data);
    
    const value = {
      clusterId: String(data.clusterId),
      nomorUnit: String(data.nomorUnit).trim(),
      tipeRumah: String(data.tipeRumah).trim(),
      statusPembangunan: String(data.statusPembangunan || 'planned'),
      progressPercentage: parseInt(data.progressPercentage ?? 0, 10),
    };

    // Handle numeric fields with null
    if (data.luasTanah !== undefined && data.luasTanah !== null) {
      const ltVal = parseFloat(data.luasTanah);
      value.luasTanah = isNaN(ltVal) ? null : ltVal;
    }
    if (data.luasBangunan !== undefined && data.luasBangunan !== null) {
      const lbVal = parseFloat(data.luasBangunan);
      value.luasBangunan = isNaN(lbVal) ? null : lbVal;
    }

    console.log('Final value object:', value);
    return value;
  });

  console.log('All values to insert:', JSON.stringify(values, null, 2));

  const result = await db
    .insert(units)
    .values(values)
    .returning();
  
  console.log('Insert result:', result);
  return result;
};

export const updateUnit = async (id, data, userContext) => {
  const updateData = {};
  
  if (data.clusterId !== undefined) updateData.clusterId = data.clusterId;
  if (data.nomorUnit !== undefined) updateData.nomorUnit = String(data.nomorUnit).trim();
  if (data.tipeRumah !== undefined) updateData.tipeRumah = String(data.tipeRumah).trim();
  if (data.statusPembangunan !== undefined) updateData.statusPembangunan = data.statusPembangunan;
  if (data.progressPercentage !== undefined) updateData.progressPercentage = data.progressPercentage;
  
  // Handle numeric fields
  if (data.luasTanah !== undefined) {
    updateData.luasTanah = data.luasTanah !== null ? parseFloat(data.luasTanah) : null;
  }
  if (data.luasBangunan !== undefined) {
    updateData.luasBangunan = data.luasBangunan !== null ? parseFloat(data.luasBangunan) : null;
  }
  
  updateData.updatedAt = new Date();

  if (userContext.role === 'admin') {
    // Pastikan unit milik company admin sebelum update
    const existing = await findUnitById(id, userContext);
    if (!existing) return null;
  }

  const result = await db
    .update(units)
    .set(updateData)
    .where(eq(units.id, id))
    .returning();
  return result[0] ?? null;
};

export const deleteUnit = async (id, userContext) => {
  if (userContext.role === 'admin') {
    const existing = await findUnitById(id, userContext);
    if (!existing) return null;
  }

  const result = await db
    .delete(units)
    .where(eq(units.id, id))
    .returning();
  return result[0] ?? null;
};