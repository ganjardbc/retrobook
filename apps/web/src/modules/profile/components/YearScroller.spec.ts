import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import YearScroller from '@/modules/profile/components/YearScroller.vue'

describe('YearScroller (PRF-05)', () => {
  const mk = (selected: number | null) =>
    mount(YearScroller, { props: { years: [2015, 2014], selected } })

  it('menampilkan Recent lalu tahun; yang terpilih ditandai aria-current', () => {
    const w = mk(2014)
    expect(w.findAll('button').map((b) => b.text())).toEqual(['Recent', '2015', '2014'])
    expect(w.findAll('button').map((b) => b.attributes('aria-current'))).toEqual([
      undefined,
      undefined,
      'true',
    ])
    expect(mk(null).findAll('button')[0]!.attributes('aria-current')).toBe('true')
  })

  it('klik memancarkan tahun, Recent memancarkan null', async () => {
    const w = mk(null)
    await w.findAll('button')[1]!.trigger('click')
    await w.findAll('button')[0]!.trigger('click')
    expect(w.emitted('select')).toEqual([[2015], [null]])
  })
})
