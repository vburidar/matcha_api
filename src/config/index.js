import dotenv from 'dotenv';

const envFound = dotenv.config();
if (!envFound) {
  throw new Error('No .env file');
}

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.APP_PORT = process.env.APP_PORT || 8080;

export default {
  port: parseInt(process.env.APP_PORT, 10),

  api: {
    prefix: process.env.API_PREFIX || '/api',
  },

  postgres: {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT, 10),
  },

  expressSession: {
    secret: process.env.EXPRESS_SESSION_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  storage: {
    system: process.env.STORAGE_SYSTEM || 'fs',
    path: process.env.STORAGE_PATH || 'public',
  },
};
