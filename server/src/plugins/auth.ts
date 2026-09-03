import type { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import env from '../env'
import { AppError } from '../utils/errors'

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL }
  })

  app.decorate('authenticate', async (request) => {
    try {
      await request.jwtVerify()
    } catch {
      throw new AppError(401, 'Unauthorized')
    }
    if (request.user.type !== 'access') {
      throw new AppError(401, 'Invalid token')
    }
  })
}
