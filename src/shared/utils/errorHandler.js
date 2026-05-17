// src/shared/utils/errorHandler.js

/**
 * Format custom error messages to be user-friendly in Indonesian.
 */
export const globalErrorHandler = (error, request, reply) => {
  request.server.log.error(error);

  let statusCode = error.statusCode || 500;
  let message = error.message || "Terjadi kesalahan pada server.";
  let errors = [];

  // 1. Validation Errors (Fastify / AJV)
  if (error.validation) {
    statusCode = 400;
    message = "Data yang Anda masukkan tidak valid.";
    errors = error.validation.map((err) => {
      const field = err.dataPath ? err.dataPath.replace(".", "") : (err.params?.missingProperty || "Input");
      
      if (err.keyword === "required") {
        return `Kolom '${field}' wajib diisi.`;
      }
      if (err.keyword === "minLength") {
        return `Kolom '${field}' minimal ${err.params.limit} karakter.`;
      }
      if (err.keyword === "format" && err.params.format === "email") {
        return `Format email pada '${field}' tidak valid.`;
      }
      if (err.keyword === "enum") {
        return `Pilihan untuk '${field}' tidak valid.`;
      }
      return err.message; // Default fallback dari AJV
    });

    // Jika hanya satu validasi error, jadikan itu message utama agar lebih mudah dibaca di mobile
    if (errors.length === 1) {
      message = errors[0];
    }
  }

  // 2. Database Errors (PostgreSQL / Drizzle)
  // 23505 = unique_violation
  if (error.code === '23505') {
    statusCode = 400;
    message = "Data tersebut sudah terdaftar di sistem. Silakan gunakan data lain.";
    
    // Opsional: Coba mendeteksi field yang duplikat jika tersedia di error.detail
    if (error.detail && error.detail.includes("Key (email)")) {
      message = "Email ini sudah terdaftar. Silakan gunakan email lain atau coba login.";
    } else if (error.detail && error.detail.includes("Key (nomor_unit)")) {
      message = "Nomor unit ini sudah terdaftar di cluster yang sama.";
    }
  }
  // 23503 = foreign_key_violation
  else if (error.code === '23503') {
    statusCode = 400;
    message = "Tindakan tidak dapat dilakukan karena data ini masih terhubung dengan data lain.";
  }

  // 3. JWT & Authentication Errors
  if (
    error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' || 
    error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID'
  ) {
    statusCode = 401;
    message = "Akses ditolak. Anda belum login atau token tidak valid.";
  } else if (error.code === 'FAST_JWT_EXPIRED' || error.message.includes('token expired')) {
    statusCode = 401;
    message = "Sesi Anda telah berakhir. Silakan login kembali.";
  }

  // Kirim response
  return reply.status(statusCode).send({
    success: false,
    message: message,
    errors: errors,
  });
};
