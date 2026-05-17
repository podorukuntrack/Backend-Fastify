// src/modules/documentation/documentation.service.js
import * as repo from './documentation.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { uploadFileToR2, deleteFileFromR2 } from '../../shared/utils/storage.js';

const fieldValue = (fields, ...keys) => {
  for (const key of keys) {
    const field = fields[key];
    if (field?.value !== undefined) return field.value;
    if (typeof field === 'string') return field;
  }
  return undefined;
};

export const getDocs = async (filters, userContext) => {
  return await repo.findAllDocs(userContext, filters);
};

export const getUnitDocs = async (unitId, userContext) => {
  // Verifikasi apakah user (terutama customer) berhak melihat unit ini
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');

  return await repo.findDocsByUnitId(unitId, userContext);
};

export const uploadDocument = async (fileBuffer, originalFilename, mimeType, fields, userContext) => {
  const unitId = fieldValue(fields, 'unit_id', 'unitId');
  const progressId = fieldValue(fields, 'progress_id', 'progressId');
  const jenis = fieldValue(fields, 'jenis', 'docType') ?? (mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('image/') ? 'foto' : 'dokumen');

  if (!unitId) {
    throw new Error('unit_id is required');
  }

  // Verifikasi kepemilikan unit oleh admin
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');

  // Upload ke Cloudflare R2
  const r2Data = await uploadFileToR2(fileBuffer, originalFilename, mimeType);

  // Siapkan data untuk database
  const docData = {
    unit_id: unitId,
    progress_id: progressId || null,
    jenis,
    url: r2Data.fileUrl,
    r2_key: r2Data.fileKey,
    nama_file: originalFilename,
    ukuran_bytes: fileBuffer.length,
    created_by: userContext.sub,
  };

  return await repo.insertDoc(docData);
};

export const removeDocument = async (id, userContext) => {
  // 1. Cari dokumen di DB
  const doc = await repo.findDocById(id, userContext);
  if (!doc) throw new Error('Document not found or access denied');

  // 2. Hapus file dari Cloudflare R2
  if (doc.r2_key) {
    await deleteFileFromR2(doc.r2_key);
  }

  // 3. Hapus record dari Database
  const deletedDoc = await repo.deleteDoc(id, userContext);
  return deletedDoc;
};
