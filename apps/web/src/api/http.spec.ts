import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, refreshSession, request, setHttpHooks } from './http'
import { session } from './session'

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })
const expired = () =>
  json(401, { statusCode: 401, message: 'Sesi kedaluwarsa', code: 'TOKEN_EXPIRED' })
const tokens = (n: number) => ({
  user: { id: 1, username: 'budi', displayName: 'Budi' },
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
})

describe('http client', () => {
  const onSessionLost = vi.fn()
  const onRefreshed = vi.fn()
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    session.clear()
    onSessionLost.mockReset()
    onRefreshed.mockReset()
    setHttpHooks({ onSessionLost, onRefreshed })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('mengirim Bearer token dan mengurai JSON', async () => {
    session.set(tokens(1))
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }))
    expect(await request('/x')).toEqual({ ok: true })
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer access-1')
  })

  it('401 -> refresh -> ulangi request dengan token baru', async () => {
    session.set(tokens(1))
    fetchMock
      .mockResolvedValueOnce(expired())
      .mockResolvedValueOnce(json(200, tokens(2)))
      .mockResolvedValueOnce(json(200, { ok: true }))
    expect(await request('/x')).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2]![1].headers.Authorization).toBe('Bearer access-2')
    expect(session.refreshToken).toBe('refresh-2')
    expect(onRefreshed).toHaveBeenCalledWith(tokens(2).user)
  })

  it('banyak request bersamaan hanya memicu satu refresh', async () => {
    session.set(tokens(1))
    let refreshCalls = 0
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++
        return json(200, tokens(2))
      }
      const bearer = (init.headers as Record<string, string>).Authorization
      return bearer === 'Bearer access-2' ? json(200, { ok: true }) : expired()
    })
    const results = await Promise.all([request('/a'), request('/b'), request('/c')])
    expect(results).toHaveLength(3)
    expect(refreshCalls).toBe(1)
  })

  it('refresh ditolak: sesi dibersihkan dan onSessionLost dipanggil', async () => {
    session.set(tokens(1))
    fetchMock
      .mockResolvedValueOnce(expired())
      .mockResolvedValueOnce(json(401, { statusCode: 401, message: 'x', code: 'UNAUTHORIZED' }))
    await expect(request('/x')).rejects.toBeInstanceOf(ApiRequestError)
    expect(session.refreshToken).toBeNull()
    expect(onSessionLost).toHaveBeenCalledWith('expired')
  })

  it('akun dibekukan (403): sesi dibersihkan', async () => {
    session.set(tokens(1))
    fetchMock.mockResolvedValueOnce(
      json(403, { statusCode: 403, message: 'x', code: 'ACCOUNT_BANNED' }),
    )
    await expect(request('/x')).rejects.toMatchObject({ code: 'ACCOUNT_BANNED' })
    expect(onSessionLost).toHaveBeenCalledWith('ACCOUNT_BANNED')
    expect(session.refreshToken).toBeNull()
  })

  it('request tanpa auth (login) tidak memicu refresh pada 401', async () => {
    session.set(tokens(1))
    fetchMock.mockResolvedValueOnce(
      json(401, { statusCode: 401, message: 'Salah', code: 'INVALID_CREDENTIALS' }),
    )
    await expect(request('/auth/login', { method: 'POST', auth: false })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(session.refreshToken).toBe('refresh-1')
  })

  it('error 500 saat refresh tidak mengakhiri sesi', async () => {
    session.set(tokens(1))
    fetchMock.mockResolvedValueOnce(
      json(500, { statusCode: 500, message: 'x', code: 'INTERNAL_ERROR' }),
    )
    await expect(refreshSession()).rejects.toBeInstanceOf(ApiRequestError)
    expect(session.refreshToken).toBe('refresh-1')
  })

  it('pesan validasi berupa array dipertahankan', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { statusCode: 400, message: ['a', 'b'], code: 'VALIDATION_FAILED' }),
    )
    await expect(request('/x', { auth: false })).rejects.toMatchObject({ messages: ['a', 'b'] })
  })

  it('FormData dikirim apa adanya tanpa Content-Type manual', async () => {
    session.set(tokens(1))
    fetchMock.mockResolvedValueOnce(json(201, { url: '/uploads/a.png' }))
    const form = new FormData()
    form.append('file', new Blob(['x']), 'a.png')
    await request('/uploads/post-image', { method: 'POST', body: form })
    const init = fetchMock.mock.calls[0]![1]
    expect(init.body).toBe(form)
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('204 mengembalikan undefined', async () => {
    session.set(tokens(1))
    fetchMock.mockResolvedValueOnce(json(204))
    expect(await request('/x', { method: 'POST' })).toBeUndefined()
  })
})
