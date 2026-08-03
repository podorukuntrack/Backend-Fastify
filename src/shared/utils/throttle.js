// src/shared/utils/throttle.js
import { getRedisClient } from './cache.js';

/**
 * Penghitung percobaan per-identitas (email / nomor kontak), disimpan di Redis.
 *
 * KENAPA TIDAK CUKUP RATE LIMIT PER-IP
 * Operator seluler di Indonesia memakai CGNAT: ribuan pelanggan bisa berbagi satu
 * IP publik. Limit per-IP yang ketat akan memblokir pengguna sah secara massal,
 * sementara penyerang dengan beberapa IP tetap lolos. Karena itu limit per-IP
 * dibuat longgar (hanya menahan serangan naif), dan pembatasan yang sesungguhnya
 * dilakukan per akun/kontak di sini.
 *
 * SIKAP SAAT REDIS MATI
 * Fail-open. Kalau Redis tidak tersedia, seluruh pengguna tidak boleh ikut
 * terkunci dari login. Limit per-IP di lapisan Fastify tetap berlaku sebagai
 * jaring pengaman.
 */

const safe = async (fn, fallback) => {
  try {
    const redis = getRedisClient();
    if (!redis) return fallback;
    return await fn(redis);
  } catch (err) {
    console.error('[Throttle] Redis error:', err.message);
    return fallback;
  }
};

/**
 * Menaikkan penghitung dan mengembalikan status.
 * TTL hanya dipasang saat penghitung pertama kali dibuat, sehingga jendela
 * waktunya tidak ikut memanjang setiap ada percobaan baru.
 */
export const hitAttempt = async (key, { max, windowSec }) =>
  safe(async (redis) => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    const ttl = await redis.ttl(key);
    return { count, exceeded: count > max, retryAfterSec: ttl > 0 ? ttl : windowSec };
  }, { count: 0, exceeded: false, retryAfterSec: 0 });

/** Membaca penghitung tanpa menaikkannya. */
export const peekAttempt = async (key, { max }) =>
  safe(async (redis) => {
    const raw = await redis.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    const ttl = await redis.ttl(key);
    return { count, exceeded: count > max, retryAfterSec: ttl > 0 ? ttl : 0 };
  }, { count: 0, exceeded: false, retryAfterSec: 0 });

/** Menghapus penghitung — dipanggil setelah percobaan yang berhasil. */
export const clearAttempt = async (key) =>
  safe(async (redis) => { await redis.del(key); return true; }, false);

/** Membulatkan detik menjadi teks menit yang enak dibaca pengguna. */
export const formatWait = (sec) => {
  if (!sec || sec <= 0) return 'beberapa saat';
  if (sec < 60) return `${sec} detik`;
  return `${Math.ceil(sec / 60)} menit`;
};

// Kunci Redis — dipisahkan agar penamaannya konsisten dan mudah diaudit.
export const throttleKeys = {
  login: (email) => `throttle:login:${String(email).toLowerCase()}`,
  otpRequest: (contact) => `throttle:otp_req:${String(contact).toLowerCase()}`,
  otpVerify: (contact) => `throttle:otp_try:${String(contact).toLowerCase()}`,
};
