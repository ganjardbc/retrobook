import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_DISPLAY_NAME, ADMIN_PASSWORD } = process.env
if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_DISPLAY_NAME || !ADMIN_PASSWORD) {
  throw new Error(
    'Set ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_DISPLAY_NAME, and ADMIN_PASSWORD before running admin:create.',
  )
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL) || ADMIN_EMAIL.length > 191) {
  throw new Error('ADMIN_EMAIL must be a valid email address (maximum 191 characters).')
}
if (!/^[A-Za-z0-9._]{3,30}$/.test(ADMIN_USERNAME)) {
  throw new Error('ADMIN_USERNAME must be 3–30 letters, numbers, dots, or underscores.')
}
if (ADMIN_DISPLAY_NAME.trim().length < 1 || ADMIN_DISPLAY_NAME.length > 80) {
  throw new Error('ADMIN_DISPLAY_NAME must be 1–80 characters.')
}
if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 128) {
  throw new Error('ADMIN_PASSWORD must be 12–128 characters.')
}

const prisma = new PrismaClient()
try {
  const passwordHash = await argon2.hash(ADMIN_PASSWORD)
  const admin = await prisma.$transaction(
    async (tx) => {
      const existingAdmin = await tx.user.findFirst({
        where: { role: 'ADMIN', deletedAt: null },
        select: { id: true },
      })
      if (existingAdmin)
        throw new Error(
          'An active admin already exists; refusing to create another via the bootstrap command.',
        )

      return tx.user.create({
        data: {
          email: ADMIN_EMAIL.toLowerCase(),
          username: ADMIN_USERNAME,
          displayName: ADMIN_DISPLAY_NAME.trim(),
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        select: { id: true, username: true },
      })
    },
    { isolationLevel: 'Serializable' },
  )
  console.info(`Created initial administrator ${admin.username} (id ${admin.id}).`)
} finally {
  await prisma.$disconnect()
}
