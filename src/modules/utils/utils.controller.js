// src/modules/utils/utils.controller.js
import { rotateFileInR2 } from '../../shared/utils/storage.js';
import { AppError } from '../../shared/utils/AppError.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export const rotateImage = async (request, reply) => {
  const { fileUrl, degrees } = request.body;

  if (!fileUrl) {
    throw new AppError(400, 'fileUrl is required');
  }

  // Extract fileKey from fileUrl
  // Example url: https://pub-xxxxxxxx.r2.dev/1721568283457-12345678.webp
  // Also handle cases with query params ?v=123
  const urlObj = new URL(fileUrl);
  const pathname = urlObj.pathname;
  const urlParts = pathname.split('/');
  const fileKey = urlParts[urlParts.length - 1];

  if (!fileKey) {
    throw new AppError(400, 'Invalid fileUrl, cannot extract fileKey');
  }

  try {
    const result = await rotateFileInR2(fileKey, degrees);
    const newUrl = result.newFileUrl;

    const tables = [
      { name: 'units', col: 'image_url' },
      { name: 'handovers', col: 'image_url' },
      { name: 'handovers', col: 'document_url' },
      { name: 'handover_defects', col: 'image_url' },
      { name: 'retentions', col: 'photo_before_url' },
      { name: 'retentions', col: 'photo_after_url' },
      { name: 'documentation', col: 'url' },
      { name: 'payment_history', col: 'bukti_pembayaran' },
      { name: 'payments', col: 'receipt_url' },
      { name: 'companies', col: 'logo_url' },
      { name: 'projects', col: 'logo_url' }
    ];

    for (const t of tables) {
      await db.execute(sql.raw(`
        UPDATE ${t.name}
        SET ${t.col} = REPLACE(${t.col}, '${fileUrl}', '${newUrl}')
        WHERE ${t.col} LIKE '%${fileKey}%'
      `)).catch(e => console.error(`Error updating ${t.name}:`, e));
    }

    return {
      message: 'Image rotated successfully',
      success: true,
      newUrl
    };
  } catch (error) {
    console.error('Rotate image error:', error);
    throw new AppError(500, 'Failed to rotate image');
  }
};
