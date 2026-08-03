// src/modules/utils/utils.routes.js
import { authorize } from '../../middleware/authorize.js';
import { rotateImage } from './utils.controller.js';

export default async function (fastify, opts) {
  // Rotate menulis ke seluruh tabel yang menyimpan URL file dan tidak ter-scope per
  // perusahaan, jadi ini murni operasi admin. Sebelumnya cukup terautentikasi —
  // artinya setiap customer aplikasi mobile pun berhak memanggilnya.
  fastify.post('/rotate-image', {
    preValidation: [fastify.authenticate],
    preHandler: [authorize('admin')],
  }, rotateImage);
}
