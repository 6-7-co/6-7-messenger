import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { listMessages, sendMessage, setMessagePinned, deleteMessage } from './messages.service'
import { parseMultipart, persistImages } from '../uploads/uploads.service'

const chatParams = z.object({
  chatId: z.string().uuid()
})

const messageParams = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid()
})

const listQuery = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
})

const pinBody = z.object({
  pinned: z.boolean()
})

export async function messagesRoutes(app: FastifyInstance): Promise<void> {
  const t = app.withTypeProvider<ZodTypeProvider>()

  t.get('/messages/:chatId', {
    preHandler: [app.authenticate],
    schema: { params: chatParams, querystring: listQuery }
  }, async (request) => {
    return listMessages(request.user.sub, request.params.chatId, request.query.before, request.query.limit)
  })

  t.post('/messages/:chatId', {
    preHandler: [app.authenticate],
    schema: { params: chatParams }
  }, async (request, reply) => {
    const parsed = await parseMultipart(request)
    const attachments = await persistImages(parsed.files)
    const message = await sendMessage(request.user.sub, request.params.chatId, {
      body: parsed.fields.body ?? null,
      attachments
    })
    return reply.status(201).send(message)
  })

  t.patch('/messages/:chatId/:messageId', {
    preHandler: [app.authenticate],
    schema: { params: messageParams, body: pinBody }
  }, async (request) => {
    return setMessagePinned(request.user.sub, request.params.chatId, request.params.messageId, request.body.pinned)
  })

  t.delete('/messages/:chatId/:messageId', {
    preHandler: [app.authenticate],
    schema: { params: messageParams }
  }, async (request) => {
    await deleteMessage(request.user.sub, request.params.chatId, request.params.messageId)
    return { ok: true }
  })
}
