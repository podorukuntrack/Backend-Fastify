// src/modules/documentation/documentation.service.js
import * as repo from './documentation.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { uploadFileToR2, deleteFileFromR2 } from '../../shared/utils/storage.js';

export const getUnitDocs = async (unitId, userContext) => {
  // Verifikasi apakah user (terutama customer) berhak melihat unit ini
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');

  return await repo.findDocsByUnitId(unitId, userContext);
};

export const uploadDocument = async (fileBuffer, originalFilename, mimeType, fields, userContext) => {
  // Validasi manual field form-data
  if (!fields.unitId || !fields.title) {
    throw new Error('unitId and title are required fields');
  }

  // Verifikasi kepemilikan unit oleh admin
  const unit = await findUnitById(fields.unitId.value, userContext);
  if (!unit) throw new Error('Unit not found or access denied');

  // Upload ke Cloudflare R2
  const r2Data = await uploadFileToR2(fileBuffer, originalFilename, mimeType);

  // Siapkan data untuk database
  const docData = {
    unitId: fields.unitId.value,
    title: fields.title.value,
    fileUrl: r2Data.fileUrl,
    fileKey: r2Data.fileKey,
    companyId: userContext.role === 'admin' ? userContext.companyId : fields.companyId?.value
  };

  return await repo.insertDoc(docData);
};

export const removeDocument = async (id, userContext) => {
  // 1. Cari dokumen di DB
  const doc = await repo.findDocById(id, userContext);
  if (!doc) throw new Error('Document not found or access denied');

  // 2. Hapus file dari Cloudflare R2
  await deleteFileFromR2(doc.fileKey);

  // 3. Hapus record dari Database
  const deletedDoc = await repo.deleteDoc(id, userContext);
  return deletedDoc;
};