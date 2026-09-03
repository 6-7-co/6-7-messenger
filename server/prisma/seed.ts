import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function ensureUser(username: string, displayName: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return existing

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
  })

  return prisma.user.create({
    data: { username, displayName, passwordHash }
  })
}

async function main() {
  const alex = await ensureUser('alex', 'Alex', 'alex-password')
  const kent = await ensureUser('kent', 'Kent', 'kent-password')

  const memberIds = [alex.id, kent.id].sort()
  const existingChat = await prisma.chat.findFirst({
    where: {
      isDirect: true,
      memberships: { every: { userId: { in: [alex.id, kent.id] } } }
    }
  })

  if (!existingChat) {
    await prisma.chat.create({
      data: {
        isDirect: true,
        createdBy: alex.id,
        memberships: {
          create: memberIds.map((id) => ({ userId: id, role: 'member' }))
        }
      }
    })
    console.log('Seeded direct chat between alex and kent')
  }

  console.log('Seeded users: alex / alex-password, kent / kent-password')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
