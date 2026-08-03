import { authorize } from '../../middleware/authorize.js';
import * as controller from './whatsapp.controller.js';

export default async function whatsappRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  // owner & direksi bersifat view-only atas project dan turunannya; mengirim pesan
  // maupun membaca isi log komunikasi (yang memuat kode OTP) bukan wewenang mereka.
  // owner tidak punya company_id, sehingga getTenantScope mengembalikan undefined
  // dan ia melihat log SELURUH perusahaan.
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  fastify.post('/send', controller.sendHandler);
  fastify.get('/logs', controller.getLogsHandler); // Ambil data dari tabel whatsapp_logs
}