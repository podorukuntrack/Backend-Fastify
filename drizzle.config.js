import 'dotenv/config';

export default {
  schema: './src/shared/schemas/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
