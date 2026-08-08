import * as service from './banners.service.js';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';
import { sendPushNotification } from '../../shared/utils/notification.js';
import { db } from '../../config/database.js';
import { users } from '../../shared/schemas/schema.js';
import { eq } from 'drizzle-orm';

// Ambil semua user_id yang berstatus customer
const getAllCustomerIds = async () => {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'customer'));
  return rows.map(r => r.id);
};

export const getAllHandler = async (request, reply) => {
  try {
    const data = await service.getBanners();
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    throw error;
  }
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getBanner(request.params.id);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    throw error;
  }
};

const parseMultipart = async (request) => {
  const fields = {};
  let fileData = null;

  if (request.isMultipart()) {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        fileData = {
          buffer: await part.toBuffer(),
          filename: part.filename,
          mimetype: part.mimetype,
        };
      } else {
        fields[part.fieldname] = part.value;
      }
    }
    return { fields, fileData };
  } else {
    return { fields: request.body || {}, fileData: null };
  }
};

export const createHandler = async (request, reply) => {
  try {
    const { fields, fileData } = await parseMultipart(request);
    if (!fileData) {
      return reply.code(400).send({ success: false, message: 'Image file is required', errors: [] });
    }
    const data = await service.createBanner(fields, fileData);
    await invalidateFor('banner');

    // Kirim notifikasi promo ke semua customer
    const customerIds = await getAllCustomerIds();
    if (customerIds.length > 0) {
      const bannerName = fields.name || 'Promo Terbaru';
      sendPushNotification(
        customerIds,
        '🎉 Promo Terbaru!',
        `Ada promo baru untuk Anda: ${bannerName}. Buka aplikasi untuk melihat selengkapnya.`,
        { type: 'promo', bannerId: data?.id?.toString() ?? '' }
      ).catch(err => console.error('[Banner Notif] Failed:', err.message));
    }

    return reply.code(201).send({ success: true, message: 'Banner created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const { fields, fileData } = await parseMultipart(request);
    const data = await service.updateBanner(request.params.id, fields, fileData);
    await invalidateFor('banner');

    // Kirim notifikasi promo ke semua customer
    const customerIds = await getAllCustomerIds();
    if (customerIds.length > 0) {
      const bannerName = fields.name || 'Promo Terbaru';
      sendPushNotification(
        customerIds,
        '🎉 Promo Diperbarui!',
        `Promo "${bannerName}" baru saja diperbarui. Buka aplikasi untuk melihat selengkapnya.`,
        { type: 'promo', bannerId: request.params.id }
      ).catch(err => console.error('[Banner Notif] Failed:', err.message));
    }

    return reply.code(200).send({ success: true, message: 'Banner updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.deleteBanner(request.params.id);
    await invalidateFor('banner');
    return reply.code(200).send({ success: true, message: 'Banner deleted', data: {} });
  } catch (error) {
    throw error;
  }
};
