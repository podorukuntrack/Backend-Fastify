// src/modules/utils/utils.controller.js
import { rotateFileInR2 } from '../../shared/utils/storage.js';
import { AppError } from '../../shared/utils/AppError.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';

export const rotateImage = async (request, reply) => {
  const { fileUrl, degrees } = request.body;

  if (!fileUrl) {
    throw new AppError('fileUrl is required', 400);
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
    throw new AppError('Invalid fileUrl, cannot extract fileKey', 400);
  }

  try {
    const result = await rotateFileInR2(fileKey, degrees);
    const newUrl = result.newFileUrl;

    const tables = [
      { name: 'units', col: 'image_url' },
      { name: 'handovers', col: 'image_url' },
      { name: 'handovers', col: 'document_url' },
      { name: 'retentions', col: 'photo_before_url' },
      { name: 'retentions', col: 'photo_after_url' },
      { name: 'documentation', col: 'url', keyCol: 'r2_key' },
      { name: 'payment_history', col: 'bukti_pembayaran' },
      { name: 'companies', col: 'logo_url' },
      { name: 'projects', col: 'logo_url' },
      { name: 'banners', col: 'image_url', keyCol: 'r2_key' }
    ];

    /**
     * Nilai (baseUrl / newUrl / fileKey) SELALU dikirim sebagai parameter query.
     * Hanya nama tabel & kolom yang di-inline lewat sql.raw, dan itu berasal dari
     * daftar tetap di atas — bukan dari input pengguna.
     *
     * Sebelumnya seluruhnya dirangkai sebagai string ke dalam sql.raw(), padahal
     * fileKey melewati decodeURIComponent sehingga tanda kutip bisa lolos masuk.
     */
    const escapeLike = (v) => v.replace(/([\\%_])/g, '\\$1');
    const likeFileKey = `%${escapeLike(fileKey)}%`;

    for (const t of tables) {
      const col = sql.raw(t.col);
      await db.execute(sql`
        UPDATE ${sql.raw(t.name)}
        SET ${col} = REPLACE(${col}, ${baseUrl}, ${newUrl})
        WHERE ${col} LIKE ${likeFileKey}
      `).catch(() => { /* Abaikan jika tabel tidak ada */ });

      if (t.keyCol) {
        const keyCol = sql.raw(t.keyCol);
        await db.execute(sql`
          UPDATE ${sql.raw(t.name)}
          SET ${keyCol} = REPLACE(${keyCol}, ${fileKey}, ${result.newFileKey})
          WHERE ${keyCol} LIKE ${likeFileKey}
        `).catch(() => {});
      }
    }

    // Khusus untuk retention_complaints karena menggunakan JSONB array
    await db.execute(sql`
      UPDATE retention_complaints
      SET photo_before_urls = CAST(REPLACE(CAST(photo_before_urls AS TEXT), ${baseUrl}, ${newUrl}) AS JSONB)
      WHERE CAST(photo_before_urls AS TEXT) LIKE ${likeFileKey}
    `).catch(() => {});

    await db.execute(sql`
      UPDATE retention_complaints
      SET photo_after_urls = CAST(REPLACE(CAST(photo_after_urls AS TEXT), ${baseUrl}, ${newUrl}) AS JSONB)
      WHERE CAST(photo_after_urls AS TEXT) LIKE ${likeFileKey}
    `).catch(() => {});
    
    // Clear Redis cache so frontend gets the new URL instead of the old one
    // rotate menulis ulang URL berkas di banyak tabel sekaligus
    await Promise.all(['documentation', 'unit', 'handover', 'retention', 'banner']
      .map((e) => invalidateFor(e)));

    return {
      message: 'Image rotated successfully',
      success: true,
      newUrl
    };
  } catch (error) {
    console.error('Rotate image error:', error);
    throw new AppError('Gagal memutar gambar. Silakan coba lagi.', 500);
  }
};
