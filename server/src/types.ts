export interface PublicUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: Date
}

export interface AccessTokenPayload {
  sub: string
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
  jti: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload | RefreshTokenPayload
    user: AccessTokenPayload | RefreshTokenPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
