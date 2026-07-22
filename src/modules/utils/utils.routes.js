// src/modules/utils/utils.routes.js
import { rotateImage } from './utils.controller.js';

export default async function (fastify, opts) {
  fastify.post('/rotate-image', {
    preValidation: [fastify.authenticate], // Only authenticated users can rotate images
  }, rotateImage);
}
