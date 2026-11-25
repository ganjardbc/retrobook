import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DateBadge from '@/modules/events/components/DateBadge.vue'
import RsvpButtons from '@/modules/events/components/RsvpButtons.vue'

describe('RsvpButtons', () => {
  it('menandai pilihan aktif dan mengirim status yang diklik', async () => {
    const w = mount(RsvpButtons, { props: { current: 'MAYBE' } })
    const buttons = w.findAll('button')
    expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
    await buttons[0]!.trigger('click')
    expect(w.emitted('set')).toEqual([['GOING']])
  })
})

describe('DateBadge', () => {
  it('menampilkan bulan singkat dan tanggal', () => {
    const w = mount(DateBadge, { props: { iso: '2030-03-09T12:00:00' } })
    expect(w.text()).toContain('9')
    expect(w.text().toUpperCase()).toContain('MAR')
  })
})
