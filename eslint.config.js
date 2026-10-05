import js from '@eslint/js';
import globals from 'globals';

// Konfigurasi ini dipakai untuk pengukuran kompleksitas siklomatik pada penelitian
// skripsi (Bab 3.11.5). Ambang 10 mengikuti Watson & McCabe (1996), NIST Special
// Publication 500-235, bagian 2.5, hlm. 15.
//
// Laporan fungsi yang melampaui ambang:
//   npx eslint src
// Nilai kompleksitas SETIAP fungsi (ambang diturunkan ke 1 agar semuanya dilaporkan):
//   npx eslint src --rule "{\"complexity\":[\"warn\",1]}" -f unix

export default [
  {
    ignores: ['node_modules/**', 'drizzle/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      complexity: ['warn', 10],
    },
  },
];
