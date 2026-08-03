// src/plugins/validator.js
import fp from 'fastify-plugin';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { removeExamples } from './swagger.js';

/**
 * Compiler validasi request.
 *
 * Sebelumnya setValidatorCompiler dipasang di dalam plugin Swagger, padahal plugin
 * itu hanya diregistrasi saat development. Akibatnya aturan validasi di produksi
 * memakai default @fastify/ajv-compiler dengan opsi yang berbeda
 * (allErrors, coerceTypes, removeAdditional), sehingga perilaku di server tidak
 * sama dengan yang diuji di lokal.
 *
 * Sekarang plugin ini selalu diregistrasi, dan Swagger hanya mengurus dokumentasi.
 */
async function validatorPlugin(fastify) {
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: false,
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  fastify.setValidatorCompiler(({ schema }) => {
    // Keyword `example`/`examples` milik OpenAPI tidak dikenali AJV
    const cleanedSchema = removeExamples(schema);
    return ajv.compile(cleanedSchema);
  });
}

export default fp(validatorPlugin, { name: 'validator-plugin' });
