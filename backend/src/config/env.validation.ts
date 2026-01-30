import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.string().valid('true', 'false').default('false'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3001'),

  // Email Service
  GOOGLE_CREDENTIALS_PATH: Joi.string().default('google-creds.json'),

  // Worker Configuration
  WORKER_BATCH_SIZE: Joi.number().min(1).max(50).default(5),
  SCHEDULER_CRON_EXPRESSION: Joi.string().default('0 6 * * *'), // Every day at 6 AM

  // Warmup Configuration
  WARMUP_INCREMENT_MIN: Joi.number().min(1).default(2),
  WARMUP_INCREMENT_MAX: Joi.number().min(2).default(6),

  // Zoho CRM Configuration
  ZOHO_CLIENT_ID: Joi.string().optional(),
  ZOHO_CLIENT_SECRET: Joi.string().optional(),
  ZOHO_REFRESH_TOKEN: Joi.string().optional(),
  ZOHO_API_DOMAIN: Joi.string().default('https://www.zohoapis.eu'),

  // Zoho Sync Configuration
  ZOHO_SYNC_BATCH_SIZE: Joi.number().min(1).max(200).default(200),
  ZOHO_SYNC_ENABLED: Joi.string().valid('true', 'false').default('true'),

  // OpenAI Configuration
  OPENAI_API_KEY: Joi.string().optional(),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: Joi.number().min(100).max(4000).default(1000),
});
