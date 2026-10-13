import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, client, http, refreshClient, setSessionEndHandler, setStaleStateHandler } from './http'
import { useNetStatus } from './netStatus'
import { session } from './session'
import type { AuthResponse } from './types'

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse
  if (status >= 400) {
    const error = Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response, config, toJSON: () => ({}) })
    throw error
  }
  return response
}

const envelope = (data: unknown, extra: object = {}) => ({ success: true, message: '', errorCode: null, data, totalCount: null, ...extra })

function authResponse(token: string): AuthResponse {
  return {
    accessToken: token,
    refreshToken: `refresh-${token}`,
    accessTokenExpiresAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
    isNewUser: false,
    user: {
      id: 'u1', username: 'owner', fullName: 'Owner', email: null, phoneNumber: '+966500000001', role: 'ProviderOwner',
      status: 'Active', tenantId: null, tenantName: null, lastLoginAt: null, isProfileComplete: true,
      permissions: [], staffRoleNameAr: null, staffRoleNameEn: null,
    },
  }
}

const originalAdapter = client.defaults.adapter
const originalRefreshAdapter = refreshClient.defaults.adapter

beforeEach(() => {
  session.clear()
  useNetStatus.setState({ rateLimitedUntil: null })
})

afterEach(() => {
  client.defaults.adapter = originalAdapter
  refreshClient.defaults.adapter = originalRefreshAdapter
  vi.useRealTimers()
})

describe('envelope unwrapping', () => {
  it('returns data on success', async () => {
    client.defaults.adapter = (async (config) => respond(config, 200, envelope({ id: 7 }))) as AxiosAdapter
    await expect(http.get<{ id: number }>('/api/x')).resolves.toEqual({ id: 7 })
  })

  it('accepts void ("") and zero payloads as success', async () => {
    client.defaults.adapter = (async (config) => respond(config, 200, envelope(config.url === '/api/void' ? '' : 0))) as AxiosAdapter
    await expect(http.post('/api/void')).resolves.toBe('')
    await expect(http.post<number>('/api/count')).resolves.toBe(0)
  })

  it('turns a business error into ApiError with errorCode and the server message', async () => {
    client.defaults.adapter = (async (config) =>
      respond(config, 400, { success: false, message: 'السلة فارغة', errorCode: 'CartEmpty', data: ['a'] })) as AxiosAdapter
    const error = await http.post('/api/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, errorCode: 'CartEmpty', message: 'السلة فارغة', details: ['a'] })
  })

  it('treats success:false with HTTP 200 as a failure', async () => {
    client.defaults.adapter = (async (config) => respond(config, 200, { success: false, message: 'no', errorCode: 'Nope', data: null })) as AxiosAdapter
    await expect(http.get('/api/x')).rejects.toMatchObject({ errorCode: 'Nope' })
  })

  it('serializes array params as repeated keys and drops empty values', async () => {
    let url = ''
    client.defaults.adapter = (async (config) => {
      url = client.getUri(config)
      return respond(config, 200, envelope([]))
    }) as AxiosAdapter
    await http.get('/api/admin/service-items', { status: ['Scheduled', 'EnRoute'], search: '', city: null, page: 1 })
    expect(url).toContain('status=Scheduled&status=EnRoute')
    expect(url).not.toContain('search=')
    expect(url).not.toContain('city=')
    expect(url).toContain('page=1')
  })
})

describe('token refresh', () => {
  it('refreshes once for concurrent 401s and replays every request', async () => {
    session.save(authResponse('old'))
    let refreshCalls = 0
    refreshClient.defaults.adapter = (async (config) => {
      refreshCalls++
      await new Promise((r) => setTimeout(r, 20))
      return respond(config, 200, envelope(authResponse('new')))
    }) as AxiosAdapter
    client.defaults.adapter = (async (config) => {
      const auth = String(config.headers.Authorization ?? '')
      return auth === 'Bearer new' ? respond(config, 200, envelope(config.url)) : respond(config, 401, { success: false, message: '', errorCode: null, data: null })
    }) as AxiosAdapter

    const results = await Promise.all([http.get('/api/a'), http.get('/api/b'), http.get('/api/c')])
    expect(results).toEqual(['/api/a', '/api/b', '/api/c'])
    expect(refreshCalls).toBe(1)
    expect(session.accessToken).toBe('new')
  })

  it('ends the session when the refresh is rejected', async () => {
    session.save(authResponse('old'))
    const ended = vi.fn()
    setSessionEndHandler(ended)
    refreshClient.defaults.adapter = (async (config) =>
      respond(config, 401, { success: false, message: '', errorCode: 'InvalidRefreshToken', data: null })) as AxiosAdapter
    client.defaults.adapter = (async (config) => respond(config, 401, { success: false, message: '', errorCode: null, data: null })) as AxiosAdapter

    await expect(http.get('/api/a')).rejects.toBeInstanceOf(ApiError)
    expect(ended).toHaveBeenCalledWith('expired')
    expect(session.refreshToken).toBeNull()
    setSessionEndHandler(() => {})
  })
})

describe('provider session and state codes (§4)', () => {
  it.each([
    ['AccountSuspended', 403, 'blocked'],
    ['TenantSuspended', 403, 'tenant'],
    ['SubscriptionExpired', 403, 'tenant'],
    ['ProviderOrganizationNotFound', 404, 'missing'],
  ] as const)('%s ends the session as %s', async (code, status, reason) => {
    session.save(authResponse('t'))
    const ended = vi.fn()
    setSessionEndHandler(ended)
    client.defaults.adapter = (async (config) => respond(config, status, { success: false, message: 'm', errorCode: code, data: null })) as AxiosAdapter
    await expect(http.get('/api/provider/organization')).rejects.toMatchObject({ errorCode: code })
    expect(ended).toHaveBeenCalledWith(reason, 'm')
    expect(session.refreshToken).toBeNull()
    setSessionEndHandler(() => {})
  })

  it('reports ProviderNotOperational without ending the session', async () => {
    session.save(authResponse('t'))
    const stale = vi.fn()
    const ended = vi.fn()
    setStaleStateHandler(stale)
    setSessionEndHandler(ended)
    client.defaults.adapter = (async (config) => respond(config, 403, { success: false, message: 'm', errorCode: 'ProviderNotOperational', data: null })) as AxiosAdapter
    await expect(http.post('/api/provider/work/items/x/delegate')).rejects.toMatchObject({ errorCode: 'ProviderNotOperational' })
    expect(stale).toHaveBeenCalledWith('ProviderNotOperational')
    expect(ended).not.toHaveBeenCalled()
    expect(session.refreshToken).not.toBeNull()
    setStaleStateHandler(() => {})
    setSessionEndHandler(() => {})
  })

  it('a bare 403 without an envelope is just an error', async () => {
    session.save(authResponse('t'))
    client.defaults.adapter = (async (config) => respond(config, 403, '')) as AxiosAdapter
    await expect(http.get('/api/provider/dashboard')).rejects.toMatchObject({ status: 403, errorCode: null })
    expect(session.refreshToken).not.toBeNull()
  })
})

describe('429 back-off', () => {
  it('marks the client as rate limited for ~10 seconds', async () => {
    client.defaults.adapter = (async (config) => respond(config, 429, { success: false, message: 'slow down', errorCode: 'RateLimited', data: null })) as AxiosAdapter
    const before = Date.now()
    await expect(http.get('/api/x')).rejects.toMatchObject({ status: 429 })
    const until = useNetStatus.getState().rateLimitedUntil
    expect(until).not.toBeNull()
    expect(until! - before).toBeGreaterThanOrEqual(9_900)
    expect(until! - before).toBeLessThanOrEqual(10_500)
  })

  it('holds the next request until the window passes', async () => {
    useNetStatus.setState({ rateLimitedUntil: Date.now() + 120 })
    const sentAt: number[] = []
    client.defaults.adapter = (async (config) => {
      sentAt.push(Date.now())
      return respond(config, 200, envelope(1))
    }) as AxiosAdapter
    const start = Date.now()
    await http.get('/api/x')
    expect(sentAt[0]! - start).toBeGreaterThanOrEqual(100)
  })
})
