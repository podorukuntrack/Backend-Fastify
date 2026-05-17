import * as repo from './progress.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { sendPushNotification } from '../../shared/utils/notification.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export const getProgressList = async (userContext, filters = {}) => {
  return await repo.findAllProgress(userContext, filters);
};

export const getProgressByUnit = async (unitId, userContext) => {
  // Verifikasi apakah user berhak melihat unit ini
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return await repo.findProgressByUnitId(unitId, userContext);
};

export const getProgress = async (id, userContext) => {
  const data = await repo.findProgressById(id, userContext);
  if (!data) throw new Error('Progress not found or access denied');
  return data;
};

export const createProgress = async (data, userContext) => {
  const unitId = data.unit_id ?? data.unitId;
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  const result = await repo.insertProgress({ ...data, unit_id: unitId }, userContext);

  try {
    const assignments = await db.execute(sql`
      SELECT user_id FROM property_assignments WHERE unit_id = ${unitId}::uuid
    `);
    const userIds = assignments.map(a => a.user_id ?? a.userId);
    if (userIds.length > 0) {
      await sendPushNotification(
        userIds,
        'Progress Rumah Terbaru!',
        `Progress pembangunan unit ${unit.nomor_unit ?? unit.nomorUnit} telah diperbarui ke ${data.progress_percentage ?? data.progressPercentage}% (${data.tahap}).`,
        { type: 'progress_update', unitId }
      );
    }
  } catch (e) {
    console.error('Failed to trigger progress create push notification:', e.message);
  }

  return result;
};

export const modifyProgress = async (id, data, userContext) => {
  const result = await repo.updateProgress(id, data, userContext);
  if (!result) throw new Error('Progress not found or access denied');

  try {
    const progress = await repo.findProgressById(id, userContext);
    if (progress) {
      const unitId = progress.unit_id ?? progress.unitId;
      const unit = await findUnitById(unitId, userContext);
      const assignments = await db.execute(sql`
        SELECT user_id FROM property_assignments WHERE unit_id = ${unitId}::uuid
      `);
      const userIds = assignments.map(a => a.user_id ?? a.userId);
      if (userIds.length > 0 && unit) {
        await sendPushNotification(
          userIds,
          'Perubahan Progress Rumah!',
          `Progress pembangunan unit ${unit.nomor_unit ?? unit.nomorUnit} diperbarui ke ${progress.progress_percentage ?? progress.progressPercentage ?? progress.percentage}% (${progress.tahap}).`,
          { type: 'progress_update', unitId }
        );
      }
    }
  } catch (e) {
    console.error('Failed to trigger progress modify push notification:', e.message);
  }

  return result;
};

export const removeProgress = async (id, userContext) => {
  const result = await repo.deleteProgress(id, userContext);
  if (!result) throw new Error('Progress not found or access denied');
  return result;
};