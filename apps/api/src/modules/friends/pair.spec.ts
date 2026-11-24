import { pairOf } from './pair'

describe('pairOf (BR-01)', () => {
  it('selalu (min, max) tanpa memandang arah', () => {
    expect(pairOf(3, 9)).toEqual({ pairLowId: 3, pairHighId: 9 })
    expect(pairOf(9, 3)).toEqual({ pairLowId: 3, pairHighId: 9 })
  })
})
