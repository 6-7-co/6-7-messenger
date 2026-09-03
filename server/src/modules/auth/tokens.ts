import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import env from '../../env'
import { prisma } from '../../db'
import { sha256 } from '../../utils/files'
import { AppError } from '../../utils/errors'
import type { RefreshTokenPayload } from '../../types'

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60000,
  h: 3600000,
  d: 86400000
}

function parseDuration(value: string): number {
  const unit = value.slice(-1)
  const amount = Number.parseInt(value.slice(0, -1), 10)
  return amount * (UNIT_MS[unit] ?? 1000)
}

async function pruneExpired(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lte: new Date() } }
  })
}

export async function issueTokenPair(app: FastifyInstance, userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  await pruneExpired(userId)

  const accessToken = app.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: env.JWT_ACCESS_TTL })
  const jti = randomUUID()
  const refreshToken = app.jwt.sign({ sub: userId, type: 'refresh', jti }, { expiresIn: env.JWT_REFRESH_TTL })

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + parseDuration(env.JWT_REFRESH_TTL))
    }
  })

  return { accessToken, refreshToken }
}

export async function rotateRefreshToken(app: FastifyInstance, rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: RefreshTokenPayload
  try {
    payload = app.jwt.verify<RefreshTokenPayload>(rawToken)
  } catch {
    throw new AppError(401, 'Invalid refresh token')
  }

  if (payload.type !== 'refresh') {
    throw new AppError(401, 'Invalid refresh token')
  }

  const tokenHash = sha256(rawToken)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!stored || stored.expiresAt <= new Date() || stored.userId !== payload.sub) {
    throw new AppError(401, 'Invalid refresh token')
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } })
  return issueTokenPair(app, payload.sub)
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = sha256(rawToken)
  await prisma.refreshToken.deleteMany({ where: { tokenHash } })
}
