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
  const urlObj = new URL(fileUrl);
  const baseUrl = urlObj.origin + urlObj.pathname;
  
  let fileKey = '';
  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  
  if (r2PublicUrl && baseUrl.startsWith(r2PublicUrl)) {
    // Extract everything after the public URL as the key (supports folders)
    fileKey = baseUrl.replace(r2PublicUrl, '');
    if (fileKey.startsWith('/')) {
      fileKey = fileKey.substring(1);
    }
    fileKey = decodeURIComponent(fileKey);
  } else {
    // Fallback: just take the last part of the path
    const urlParts = baseUrl.split('/');
    fileKey = decodeURIComponent(urlParts[urlParts.length - 1]);
  }

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
        SET ${t.col} = REPLACE(${t.col}, '${baseUrl}', '${newUrl}')
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
    throw new AppError(500, `Failed to rotate image: ${error.message} (Key: ${fileKey})`);
  }
};
