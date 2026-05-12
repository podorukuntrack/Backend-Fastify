// src/server.js
import { buildApp } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();