// src/shared/utils/fileTypes.js
import path from 'path';
import { AppError } from './AppError.js';

/**
 * Whitelist tipe berkas yang boleh diunggah.
 *
 * Sebelumnya penyaringan hanya `mimetype.startsWith('image/') ||
 * startsWith('application/')`, yang menerima apa pun termasuk
 * `application/xhtml+xml`. Berkas .html yang tersaji dari domain aset menjadi
 * XSS tersimpan pada domain kita sendiri.
 *
 * Dasar pemilihan: seluruh 1.194 dokumen produksi hanya berisi jpeg, jpg, png,
 * webp, dan pdf. Format Office ditambahkan untuk kebutuhan wajar ke depan
 * (kontrak, rekap), tetap aman karena disajikan sebagai unduhan.
 *
 * SVG SENGAJA TIDAK DIIZINKAN: bisa memuat <script> dan dirender inline browser.
 */
const ALLOWED = {
  '.jpg':  { mime: 'image/jpeg', image: true },
  '.jpeg': { mime: 'image/jpeg', image: true },
  '.png':  { mime: 'image/png',  image: true },
  '.webp': { mime: 'image/webp', image: true },
  '.pdf':  { mime: 'application/pdf', image: false },
  '.doc':  { mime: 'application/msword', image: false },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', image: false },
  '.xls':  { mime: 'application/vnd.ms-excel', image: false },
  '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', image: false },
};

const startsWith = (buf, bytes, offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

/**
 * Menebak tipe berkas dari isinya, bukan dari nama atau header yang dikirim
 * klien — keduanya sepenuhnya bisa dipalsukan.
 */
const sniff = (buf) => {
  if (!buf || buf.length < 8) return null;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';              // %PDF-
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return 'zip';                     // docx/xlsx
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole'; // doc/xls lama
  return null;
};

// Isi berkas yang dapat diterima untuk tiap ekstensi.
const EXPECTED = {
  '.jpg': ['jpeg'], '.jpeg': ['jpeg'], '.png': ['png'], '.webp': ['webp'],
  '.pdf': ['pdf'],
  '.doc': ['ole'], '.xls': ['ole'],
  '.docx': ['zip'], '.xlsx': ['zip'],
};

export const allowedExtensions = Object.keys(ALLOWED);

/** Membersihkan nama berkas untuk disimpan/ditampilkan, bukan untuk kunci objek. */
export const sanitizeFilename = (name) => {
  const base = path.basename(String(name || 'file'));
  return base.replace(/[^\w.\- ()]/g, '_').slice(0, 200) || 'file';
};

/**
 * Memvalidasi berkas unggahan.
 * Melempar AppError 400 bila ditolak; mengembalikan tipe yang sudah dipastikan.
 */
export const validateUpload = (buffer, originalFilename, clientMimeType) => {
  const ext = path.extname(String(originalFilename || '')).toLowerCase();
  const rule = ALLOWED[ext];

  if (!rule) {
    throw new AppError(
      `Tipe berkas "${ext || 'tanpa ekstensi'}" tidak diizinkan. ` +
      `Format yang diterima: ${allowedExtensions.join(', ')}.`,
      400
    );
  }

  const actual = sniff(buffer);
  if (!actual || !EXPECTED[ext].includes(actual)) {
    throw new AppError(
      `Isi berkas tidak cocok dengan ekstensi "${ext}". ` +
      `Pastikan berkas tidak rusak dan ekstensinya benar.`,
      400
    );
  }

  // Ketidakcocokan mimetype dari klien tidak menggagalkan unggahan — beberapa
  // klien mengirim application/octet-stream — karena isi berkas sudah diperiksa.
  // Yang penting: nilai dari klien TIDAK dipakai saat menyimpan.
  return {
    ext,
    mime: rule.mime,
    isImage: rule.image,
    clientMimeType: clientMimeType ?? null,
  };
};
