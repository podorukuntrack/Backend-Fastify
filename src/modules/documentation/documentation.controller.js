// src/modules/documentation/documentation.controller.js
import * as service from './documentation.service.js';
import { withCache, CACHE_TTL } from '../../shared/utils/cache.js';
import { allowedExtensions as ALLOWED_UPLOAD_EXTENSIONS } from '../../shared/utils/fileTypes.js';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `documentations:list:${request.user.sub}:${request.user.companyId || 'all'}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getDocs(request.query, request.user);
  }, CACHE_TTL);
  return reply.code(200).send({ success: true, message: 'Documents retrieved', data, source });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const cacheKey = `documentations:unit:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUnitDocs(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Documents retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const uploadHandler = async (request, reply) => {
  try {
    // Membaca file dan field text dari request multipart/form-data
    const data = await request.file();
    
    if (!data) {
      console.log("[UPLOAD DEBUG] No file uploaded!");
      return reply.code(400).send({ success: false, message: 'No file uploaded', errors: [] });
    }

    // Penyaringan sesungguhnya ada di uploadFileToR2 (whitelist ekstensi +
    // pemeriksaan magic bytes), karena mimetype dan nama berkas dari klien
    // sepenuhnya bisa dipalsukan. Pemeriksaan cepat di sini hanya untuk menolak
    // lebih awal sebelum berkas dibaca seluruhnya ke memori.
    if (!ALLOWED_UPLOAD_EXTENSIONS.some((e) => (data.filename || '').toLowerCase().endsWith(e))) {
      return reply.code(400).send({
        success: false,
        message: `Tipe berkas tidak diizinkan. Format yang diterima: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}.`,
        errors: [],
      });
    }

    console.log("[UPLOAD DEBUG] File received:", data.filename);
    console.log("[UPLOAD DEBUG] Mimetype:", data.mimetype);
    // data.fields contains circular references in fastify-multipart, do not stringify
    // console.log("[UPLOAD DEBUG] Fields keys:", Object.keys(data.fields));

    const fileBuffer = await data.toBuffer();
    
    const result = await service.uploadDocument(
      fileBuffer,
      data.filename,
      data.mimetype,
      data.fields,
      request.user
    );

    await invalidateFor('documentation');

    return reply.code(201).send({ success: true, message: 'Document uploaded successfully', data: result });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeDocument(request.params.id, request.user);
    await invalidateFor('documentation');
    return reply.code(200).send({ success: true, message: 'Document deleted successfully', data: {} });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyDocument(request.params.id, request.body, request.user);
    await invalidateFor('documentation');
    return reply.code(200).send({ success: true, message: 'Document updated successfully', data });
  } catch (error) {
    throw error;
  }
};
