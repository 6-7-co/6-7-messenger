import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { registerUser, loginUser, refreshUser, logoutUser, getMe } from './auth.service'

const registerBody = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/, 'Username must be 3-32 alphanumeric or underscore characters'),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(64)
})

const loginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

const refreshBody = z.object({
  refreshToken: z.string().min(1)
})

const authLimits = { max: 10, timeWindow: '1 minute' }

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const t = app.withTypeProvider<ZodTypeProvider>()

  t.post('/auth/register', {
    config: { rateLimit: authLimits },
    schema: { body: registerBody }
  }, async (request, reply) => {
    const result = await registerUser(app, request.body)
    return reply.status(201).send(result)
  })

  t.post('/auth/login', {
    config: { rateLimit: authLimits },
    schema: { body: loginBody }
  }, async (request) => {
    return loginUser(app, request.body)
  })

  t.post('/auth/refresh', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: { body: refreshBody }
  }, async (request) => {
    return refreshUser(app, request.body.refreshToken)
  })

  t.post('/auth/logout', {
    preHandler: [app.authenticate],
    schema: { body: refreshBody }
  }, async (request) => {
    await logoutUser(request.body.refreshToken)
    return { ok: true }
  })

  t.get('/auth/me', {
    preHandler: [app.authenticate]
  }, async (request) => {
    return getMe(request.user.sub)
  })
}
