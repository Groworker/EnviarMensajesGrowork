export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'true',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3001',
    ],
  },
  email: {
    googleCredentialsPath:
      process.env.GOOGLE_CREDENTIALS_PATH || 'google-creds.json',
  },
  worker: {
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '5', 10),
    schedulerCron: process.env.SCHEDULER_CRON_EXPRESSION || '0 6 * * *',
  },
  warmup: {
    incrementMin: parseInt(process.env.WARMUP_INCREMENT_MIN || '2', 10),
    incrementMax: parseInt(process.env.WARMUP_INCREMENT_MAX || '6', 10),
  },
});
