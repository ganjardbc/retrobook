import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginView from '@/modules/auth/pages/LoginView.vue'
import RegisterView from '@/modules/auth/pages/RegisterView.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { ApiRequestError, request } from '@/plugins/http'

const limited = (seconds?: number) =>
  new ApiRequestError(429, 'RATE_LIMITED', ['Terlalu banyak percobaan'], seconds)

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p/>' } },
      { path: '/login', name: 'login', component: { template: '<p/>' } },
      { path: '/register', name: 'register', component: { template: '<p/>' } },
    ],
  })

describe('http: header Retry-After', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('429 membawa retryAfter dalam detik; tanpa header: undefined', async () => {
    const mk = (headers: Record<string, string>) =>
      new Response(JSON.stringify({ statusCode: 429, message: 'pelan', code: 'RATE_LIMITED' }), {
        status: 429,
        headers,
      })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mk({ 'Retry-After': '42' })))
    await expect(request('/x')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfter: 42,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mk({})))
    await expect(request('/x')).rejects.toMatchObject({ status: 429, retryAfter: undefined })
  })
})

describe('Login dan Register: pesan jeda dengan hitung mundur', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  const submitButton = (w: ReturnType<typeof mount>) => w.find('button[type="submit"]')

  it('login 429: pesan dengan sisa detik turun tiap detik, tombol nonaktif, submit diabaikan, lalu pulih', async () => {
    const login = vi.spyOn(useAuthStore(), 'login').mockRejectedValue(limited(3))
    const w = mount(LoginView, { global: { plugins: [router()] } })
    await w.find('input[name="identifier"]').setValue('a')
    await w.find('input[type="password"]').setValue('x')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Too many attempts. Please try again in 3 seconds.')
    expect(submitButton(w).attributes('disabled')).toBeDefined()

    await w.find('form').trigger('submit') // saat jeda: tidak memanggil server lagi
    expect(login).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(w.text()).toContain('in 2 seconds')
    await vi.advanceTimersByTimeAsync(2000)
    expect(w.text()).not.toContain('Too many attempts')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
  })

  it('tanpa Retry-After: jeda bawaan 60 detik; galat lain tetap tampil sebagai pesan biasa', async () => {
    const login = vi.spyOn(useAuthStore(), 'login').mockRejectedValueOnce(limited())
    const w = mount(LoginView, { global: { plugins: [router()] } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('in 60 seconds')

    login.mockRejectedValueOnce(new ApiRequestError(401, 'INVALID_CREDENTIALS', ['Salah']))
    const other = mount(LoginView, { global: { plugins: [router()] } })
    await other.find('form').trigger('submit')
    await flushPromises()
    expect(other.text()).toContain('Salah')
    expect(other.text()).not.toContain('Too many attempts')
    expect(submitButton(other).attributes('disabled')).toBeUndefined()
  })

  it('register 429: pesan jeda, tombol nonaktif, pulih setelah hitung mundur', async () => {
    const register = vi.spyOn(useAuthStore(), 'register').mockRejectedValue(limited(2))
    const w = mount(RegisterView, { global: { plugins: [router()] } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Too many attempts. Please try again in 2 seconds.')
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await w.find('form').trigger('submit')
    expect(register).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
  })
})
