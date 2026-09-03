import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,null'),
  UPLOAD_DIR: z.string().default('storage/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),
  TRUST_PROXY: z.string().default('false')
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

export default {
  ...env,
  TRUST_PROXY: env.TRUST_PROXY === 'true',
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  maxUploadBytes: env.MAX_UPLOAD_MB * 1024 * 1024
}
