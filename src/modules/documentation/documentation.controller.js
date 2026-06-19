// src/modules/documentation/documentation.controller.js
import * as service from './documentation.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `documentations:list:${request.user.id}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getDocs(request.query, request.user);
  }, 3600);
  return reply.code(200).send({ success: true, message: 'Documents retrieved', data, source });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const cacheKey = `documentations:unit:${request.user.id}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUnitDocs(request.params.id, request.user);
    }, 3600);
    return reply.code(200).send({ success: true, message: 'Documents retrieved', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
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

    if (!data.mimetype.startsWith('image/')) {
      return reply.code(400).send({ success: false, message: 'Hanya file gambar (image/*) yang diperbolehkan!', errors: [] });
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

    await clearCachePattern('documentations:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');

    return reply.code(201).send({ success: true, message: 'Document uploaded successfully', data: result });
  } catch (error) {
    console.error("[UPLOAD ERROR DEBUG]", error);
    return reply.code(400).send({ success: false, message: 'SERVER_ERROR: ' + error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeDocument(request.params.id, request.user);
    await clearCachePattern('documentations:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    return reply.code(200).send({ success: true, message: 'Document deleted successfully', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};
