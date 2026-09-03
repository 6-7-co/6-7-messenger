import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createDirectChat, getChat, listChats } from './chats.service'

const createBody = z.object({
  userId: z.string().uuid()
})

const params = z.object({
  chatId: z.string().uuid()
})

export async function chatsRoutes(app: FastifyInstance): Promise<void> {
  const t = app.withTypeProvider<ZodTypeProvider>()

  t.get('/chats', {
    preHandler: [app.authenticate]
  }, async (request) => {
    return listChats(request.user.sub)
  })

  t.get('/chats/:chatId', {
    preHandler: [app.authenticate],
    schema: { params }
  }, async (request) => {
    return getChat(request.user.sub, request.params.chatId)
  })

  t.post('/chats/direct', {
    preHandler: [app.authenticate],
    schema: { body: createBody }
  }, async (request) => {
    const chat = await createDirectChat(request.user.sub, request.body.userId)
    return chat
  })
}
