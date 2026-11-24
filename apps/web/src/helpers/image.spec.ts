import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, imageProblem } from '@/helpers/image'

const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'f', { type })

describe('imageProblem', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('%s lolos', (t) =>
    expect(imageProblem(file(t))).toBeNull(),
  )
  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('tipe %j ditolak', (t) =>
    expect(imageProblem(file(t))).toBe('upload.error.type'),
  )
  it('tepat 5 MB lolos, lebih satu byte ditolak', () => {
    expect(imageProblem(file('image/png', MAX_IMAGE_BYTES))).toBeNull()
    expect(imageProblem(file('image/png', MAX_IMAGE_BYTES + 1))).toBe('upload.error.size')
  })
})
