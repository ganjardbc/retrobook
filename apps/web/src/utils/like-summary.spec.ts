import type { Post, UserSummary } from '@retrobook/shared'
import { describe, expect, it } from 'vitest'
import { likeSummaryParts, likeSummaryText } from './like-summary'

const u = (id: number, name: string): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})
const post = (over: Partial<Post>): Post =>
  ({ likeCount: 0, likedByMe: false, likedPreview: [], ...over }) as Post

describe('likeSummaryText (INT-01: 0, 1, 2, 3, banyak)', () => {
  it.each([
    ['0 penyuka: kosong', post({}), 99, ''],
    ['1 penyuka', post({ likeCount: 1, likedPreview: [u(1, 'Sari')] }), 99, 'Sari likes this.'],
    [
      '2 penyuka',
      post({ likeCount: 2, likedPreview: [u(2, 'Budi'), u(1, 'Sari')] }),
      99,
      'Budi and Sari like this.',
    ],
    [
      '3 penyuka: 1 lainnya',
      post({ likeCount: 3, likedPreview: [u(3, 'Citra'), u(2, 'Budi')] }),
      99,
      'Citra, Budi, and 1 other like this.',
    ],
    [
      'banyak penyuka',
      post({ likeCount: 13, likedPreview: [u(3, 'Citra'), u(2, 'Budi')] }),
      99,
      'Citra, Budi, and 11 others like this.',
    ],
  ])('%s', (_n, p, me, expected) => {
    expect(likeSummaryText(p, me)).toBe(expected)
  })

  it('hanya saya: "You like this."', () => {
    expect(
      likeSummaryText(post({ likeCount: 1, likedByMe: true, likedPreview: [u(99, 'Me')] }), 99),
    ).toBe('You like this.')
  })

  it('saya dan satu lagi: "You and X like this."; saya tidak dihitung dua kali dari pratinjau', () => {
    const p = post({ likeCount: 2, likedByMe: true, likedPreview: [u(99, 'Me'), u(1, 'Sari')] })
    expect(likeSummaryText(p, 99)).toBe('You and Sari like this.')
  })

  it('saya + banyak lainnya: "You, X, and N others"', () => {
    const p = post({ likeCount: 6, likedByMe: true, likedPreview: [u(2, 'Budi'), u(1, 'Sari')] })
    expect(likeSummaryText(p, 99)).toBe('You, Budi, and 4 others like this.')
  })

  it('pratinjau kosong tapi jumlah ada: tetap menampilkan jumlah', () => {
    expect(likeSummaryText(post({ likeCount: 4, likedByMe: true, likedPreview: [] }), 99)).toBe(
      'You and 3 others like this.',
    )
  })

  it('nama menjadi tautan profil; "You" dan jumlah bukan tautan', () => {
    const p = post({ likeCount: 5, likedByMe: true, likedPreview: [u(2, 'Budi'), u(1, 'Sari')] })
    const parts = likeSummaryParts(p, 99)
    expect(parts.filter((x) => x.username).map((x) => x.username)).toEqual(['budi'])
    expect(parts.find((x) => x.text === 'You')?.username).toBeUndefined()
  })
})
