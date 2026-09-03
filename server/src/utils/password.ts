import argon2 from 'argon2'

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1
} as const

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS)
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain)
}
