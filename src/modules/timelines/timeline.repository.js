// src/modules/timelines/timeline.repository.js
import { db } from '../../config/database.js';
import { timelines } from '../../shared/schemas/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findTimelines = async (userContext, filters = {}) => {
  const scope = getTenantScope(timelines, userContext);
  const conditions = [];
  if (scope) conditions.push(scope);
  if (filters.unitId) conditions.push(eq(timelines.unitId, filters.unitId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return await db.select().from(timelines).where(where).orderBy(timelines.startDate);
};

export const insertTimeline = async (data) => {
  data.startDate = new Date(data.startDate);
  data.endDate = new Date(data.endDate);
  const result = await db.insert(timelines).values(data).returning();
  
  const unitId = data.unitId;
  const totalRes = await db.execute(sql`
    SELECT 
      COALESCE(
        SUM(LEAST(100, COALESCE(tp.total_tahap, 0))) / NULLIF(COUNT(t.id), 0), 
        0
      ) AS total
    FROM timelines t
    LEFT JOIN (
      SELECT tahap, SUM(progress_percentage) AS total_tahap
      FROM progress
      WHERE unit_id = ${unitId}
      GROUP BY tahap
    ) tp ON tp.tahap = t.task_name
    WHERE t.unit_id = ${unitId}
  `);
  
  const total = Math.round(Number(totalRes[0].total ?? 0));

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = ${total},
           status_pembangunan = CASE
             WHEN ${total} >= 100 THEN 'selesai'
             WHEN ${total} > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${unitId}
  `);

  return result[0];
};

export const updateTimeline = async (id, data, userContext) => {
  const scope = getTenantScope(timelines, userContext);
  const condition = scope ? and(eq(timelines.id, id), scope) : eq(timelines.id, id);
  // Find existing to know the old taskName
  const existing = await db.select().from(timelines).where(condition).limit(1);
  if (!existing || existing.length === 0) return null;
  const oldTimeline = existing[0];

  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  data.updatedAt = new Date();
  
  const result = await db.update(timelines).set(data).where(condition).returning();

  // If taskName changed, update progress tahap
  if (data.taskName && data.taskName !== oldTimeline.taskName) {
    await db.execute(sql`
      UPDATE progress
      SET tahap = ${data.taskName}
      WHERE unit_id = ${oldTimeline.unitId} AND tahap = ${oldTimeline.taskName}
    `);
  }

  const unitId = oldTimeline.unitId;
  const totalRes = await db.execute(sql`
    SELECT 
      COALESCE(
        SUM(LEAST(100, COALESCE(tp.total_tahap, 0))) / NULLIF(COUNT(t.id), 0), 
        0
      ) AS total
    FROM timelines t
    LEFT JOIN (
      SELECT tahap, SUM(progress_percentage) AS total_tahap
      FROM progress
      WHERE unit_id = ${unitId}
      GROUP BY tahap
    ) tp ON tp.tahap = t.task_name
    WHERE t.unit_id = ${unitId}
  `);
  
  const total = Math.round(Number(totalRes[0].total ?? 0));

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = ${total},
           status_pembangunan = CASE
             WHEN ${total} >= 100 THEN 'selesai'
             WHEN ${total} > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${unitId}
  `);

  return result[0];
};

export const deleteTimeline = async (id, userContext) => {
  const scope = getTenantScope(timelines, userContext);
  const condition = scope ? and(eq(timelines.id, id), scope) : eq(timelines.id, id);
  // Find the timeline first
  const existing = await db.select().from(timelines).where(condition).limit(1);
  if (!existing || existing.length === 0) return null;
  const timeline = existing[0];

  // Delete the timeline
  const result = await db.delete(timelines).where(condition).returning();

  // Delete associated progress
  await db.execute(sql`
    DELETE FROM progress 
    WHERE unit_id = ${timeline.unitId} 
      AND tahap = ${timeline.taskName}
  `);

  // Recalculate unit progress
  const totalRes = await db.execute(sql`
    SELECT 
      COALESCE(
        SUM(LEAST(100, COALESCE(tp.total_tahap, 0))) / NULLIF(COUNT(t.id), 0), 
        0
      ) AS total
    FROM timelines t
    LEFT JOIN (
      SELECT tahap, SUM(progress_percentage) AS total_tahap
      FROM progress
      WHERE unit_id = ${timeline.unitId}
      GROUP BY tahap
    ) tp ON tp.tahap = t.task_name
    WHERE t.unit_id = ${timeline.unitId}
  `);
  
  const total = Math.round(Number(totalRes[0].total ?? 0));

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = ${total},
           status_pembangunan = CASE
             WHEN ${total} >= 100 THEN 'selesai'
             WHEN ${total} > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${timeline.unitId}
  `);

  return result[0];
};