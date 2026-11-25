import type { PrismaClient } from '@prisma/client'

/** Kosongkan semua tabel (urutan mengikuti FK). HANYA untuk database uji. */
export async function resetDb(prisma: PrismaClient) {
  await prisma.auditLog.deleteMany()
  await prisma.blockedWord.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.report.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.postHashtag.deleteMany()
  await prisma.postTag.deleteMany()
  await prisma.like.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.hashtag.deleteMany()
  await prisma.message.deleteMany()
  await prisma.poke.deleteMany()
  await prisma.block.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
}
