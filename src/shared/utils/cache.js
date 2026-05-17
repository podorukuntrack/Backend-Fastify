// src/shared/utils/cache.js

let redisClient = null;

/**
 * Menginisialisasi Redis client untuk utility cache.
 * Dipanggil dari plugin Fastify (misal: src/plugins/redis.js).
 * @param {import('ioredis').Redis} client 
 */
export const setRedisClient = (client) => {
  redisClient = client;
};

/** Mengembalikan instance Redis Client (untuk health check) */
export const getRedisClient = () => redisClient;

/**
 * Menyimpan data ke dalam Redis Cache.
 * @param {string} key Kunci cache
 * @param {any} value Nilai yang ingin disimpan (akan di-stringifikasi ke JSON)
 * @param {number} ttl Time To Live dalam detik (default: 3600 / 1 jam)
 */
export const setCache = async (key, value, ttl = 3600) => {
  if (!redisClient) {
    console.warn('⚠️ [Cache] Redis client is not initialized. Skipping setCache.');
    return;
  }
  try {
    const stringValue = JSON.stringify(value);
    await redisClient.set(key, stringValue, 'EX', ttl);
  } catch (error) {
    console.error(`❌ [Cache] Error setting cache for key ${key}:`, error.message);
  }
};

/**
 * Mengambil data dari Redis Cache.
 * @param {string} key Kunci cache
 * @returns {Promise<any | null>} Mengembalikan data yang di-parse, atau null jika tidak ada/error
 */
export const getCache = async (key) => {
  if (!redisClient) {
    console.warn('⚠️ [Cache] Redis client is not initialized. Skipping getCache.');
    return null;
  }
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ [Cache] Error getting cache for key ${key}:`, error.message);
    return null;
  }
};

/**
 * Menghapus data dari Redis Cache.
 * @param {string} key Kunci cache
 */
export const delCache = async (key) => {
  if (!redisClient) {
    console.warn('⚠️ [Cache] Redis client is not initialized. Skipping delCache.');
    return;
  }
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`❌ [Cache] Error deleting cache for key ${key}:`, error.message);
  }
};

/**
 * Membersihkan semua data yang memiliki prefix tertentu.
 * Berguna saat ingin invalidasi cache berbasis pattern (contoh: "users:*").
 * @param {string} pattern Pattern kunci, misal "users:*"
 */
export const clearCachePattern = async (pattern) => {
  if (!redisClient) {
    console.warn('⚠️ [Cache] Redis client is not initialized. Skipping clearCachePattern.');
    return;
  }
  try {
    let cursor = '0';
    do {
      const result = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error(`❌ [Cache] Error clearing cache pattern ${pattern}:`, error.message);
  }
};
