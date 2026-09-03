import type { FastifyInstance } from 'fastify'

export class AppError extends Error {
  statusCode: number
  details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message, details: error.details })
    }

    const err = error as Error & { validation?: unknown }
    if ('validation' in err && Array.isArray(err.validation)) {
      return reply.status(400).send({ error: 'Validation error', details: err.validation })
    }

    request.log.error(err)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: 'Not found' })
  })
}
