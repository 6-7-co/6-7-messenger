import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../../db'
import { toPublicUser } from '../auth/auth.service'
import { parseMultipart, setAvatar } from '../uploads/uploads.service'
import { AppError } from '../../utils/errors'

const searchQuery = z.object({
  q: z.string().min(1).max(64)
})

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  const t = app.withTypeProvider<ZodTypeProvider>()

  t.get('/users/search', {
    preHandler: [app.authenticate],
    schema: { querystring: searchQuery }
  }, async (request) => {
    const me = request.user.sub
    const q = request.query.q.trim()

    const users = await prisma.user.findMany({
      where: {
        id: { not: me },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20,
      select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true }
    })

    return users.map(toPublicUser)
  })

  t.post('/users/avatar', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const parsed = await parseMultipart(request)
    if (parsed.files.length !== 1) {
      throw new AppError(400, 'Exactly one avatar file is required')
    }
    const user = await setAvatar(request.user.sub, parsed.files[0])
    return reply.status(200).send(user)
  })
}
