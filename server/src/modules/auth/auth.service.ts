import type { FastifyInstance } from 'fastify'
import { prisma } from '../../db'
import { hashPassword, verifyPassword } from '../../utils/password'
import { AppError } from '../../utils/errors'
import type { PublicUser } from '../../types'
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken } from './tokens'

export function toPublicUser(user: { id: string; username: string; displayName: string; avatarUrl: string | null; createdAt: Date }): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt
  }
}

export async function registerUser(app: FastifyInstance, input: { username: string; password: string; displayName: string }) {
  const existing = await prisma.user.findUnique({ where: { username: input.username } })
  if (existing) {
    throw new AppError(409, 'Username already taken')
  }

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      username: input.username,
      displayName: input.displayName,
      passwordHash
    }
  })

  const tokens = await issueTokenPair(app, user.id)
  return { user: toPublicUser(user), ...tokens }
}

export async function loginUser(app: FastifyInstance, input: { username: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { username: input.username } })
  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new AppError(401, 'Invalid credentials')
  }

  const tokens = await issueTokenPair(app, user.id)
  return { user: toPublicUser(user), ...tokens }
}

export async function refreshUser(app: FastifyInstance, refreshToken: string) {
  const tokens = await rotateRefreshToken(app, refreshToken)
  return tokens
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken)
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true }
  })
  if (!user) {
    throw new AppError(404, 'User not found')
  }
  return toPublicUser(user)
}
