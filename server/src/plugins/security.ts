import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

interface SecurityOptions {
  corsOrigins: string[]
  trustProxy: boolean
}

export async function registerSecurity(app: FastifyInstance, options: SecurityOptions): Promise<void> {
  app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })

  app.register(cors, {
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (options.corsOrigins.includes('*') || options.corsOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('Origin not allowed'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
  })

  app.register(rateLimit, {
    max: 600,
    timeWindow: '1 minute'
  })
}
