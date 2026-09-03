import Fastify from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import env from './env'
import { prisma } from './db'
import { registerSecurity } from './plugins/security'
import { registerAuth } from './plugins/auth'
import { registerErrorHandler } from './utils/errors'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { chatsRoutes } from './modules/chats/chats.routes'
import { messagesRoutes } from './modules/messages/messages.routes'
import { registerWs } from './modules/ws/ws.routes'
import { mkdir } from 'node:fs/promises'

async function buildApp() {
  const app = Fastify({
    trustProxy: env.TRUST_PROXY,
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn'
    },
    bodyLimit: env.maxUploadBytes + 1024 * 1024
  }).withTypeProvider<ZodTypeProvider>()

  await registerSecurity(app, { corsOrigins: env.corsOrigins, trustProxy: env.TRUST_PROXY })
  await registerAuth(app)

  await mkdir(env.UPLOAD_DIR, { recursive: true })

  await app.register(fastifyStatic, {
    root: env.UPLOAD_DIR,
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
    }
  })

  await app.register(multipart, {
    limits: {
      files: 10,
      fileSize: env.maxUploadBytes
    }
  })

  await app.register(websocket)

  await authRoutes(app)
  await usersRoutes(app)
  await chatsRoutes(app)
  await messagesRoutes(app)
  await registerWs(app)

  registerErrorHandler(app)

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }))

  return app
}

async function start() {
  const app = await buildApp()
  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`Server listening on ${env.HOST}:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

async function shutdown(signal: string) {
  const app = await buildApp()
  app.log.info(`Received ${signal}, shutting down`)
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

if (require.main === module) {
  start()
}

export { buildApp }
