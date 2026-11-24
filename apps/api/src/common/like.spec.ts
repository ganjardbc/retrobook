import { escapeLike } from './like'

describe('escapeLike', () => {
  it.each([
    ['budi', 'budi'],
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['c:\\x', 'c:\\\\x'],
    ['%_\\', '\\%\\_\\\\'],
  ])('%s', (input, expected) => {
    expect(escapeLike(input)).toBe(expected)
  })
})
