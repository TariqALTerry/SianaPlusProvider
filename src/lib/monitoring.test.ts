import { describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import type { Breadcrumb, Event } from '@sentry/react'
import { monitoringEnabled, reportError, startMonitoring } from './monitoring'
import { initSentry, scrubBreadcrumb, scrubEvent, scrubText, spanName, tracesSampleRate } from './monitoringSdk'

describe('monitoring without a DSN', () => {
  it('is off and every entry point is a no-op', () => {
    expect(monitoringEnabled).toBe(false)
    const add = vi.spyOn(window, 'addEventListener')
    startMonitoring()
    reportError(new Error('boom'), 'stack')
    expect(add).not.toHaveBeenCalled()
    add.mockRestore()
  })
})

describe('tracesSampleRate', () => {
  it('defaults to 0.1 and accepts only 0..1', () => {
    expect(tracesSampleRate(undefined)).toBe(0.1)
    expect(tracesSampleRate('')).toBe(0.1)
    expect(tracesSampleRate('abc')).toBe(0.1)
    expect(tracesSampleRate('2')).toBe(0.1)
    expect(tracesSampleRate('0')).toBe(0)
    expect(tracesSampleRate('0.25')).toBe(0.25)
  })
})

describe('scrubbing', () => {
  it('redacts bearer tokens and sensitive query values only', () => {
    expect(scrubText('Authorization: Bearer abc.def-ghi')).toBe('Authorization: Bearer [Filtered]')
    expect(scrubText('https://x.test/api/work?Search=0555&page=2&token=t#a')).toBe('https://x.test/api/work?Search=[Filtered]&page=2&token=[Filtered]#a')
    expect(scrubText('GET /api/auth/otp?phone=%2B9665&tab=open')).toBe('GET /api/auth/otp?phone=[Filtered]&tab=open')
  })

  it('drops headers and tokens from breadcrumbs', () => {
    const crumb: Breadcrumb = {
      category: 'xhr',
      data: { url: '/api/x?email=a@b.c', status_code: 200, request_headers: { Authorization: 'Bearer abc' }, accessToken: 'abc' },
    }
    expect(scrubBreadcrumb(crumb).data).toEqual({
      url: '/api/x?email=[Filtered]',
      status_code: 200,
      request_headers: { Authorization: '[Filtered]' },
      accessToken: '[Filtered]',
    })
  })

  it('keeps only the user id and strips request credentials', () => {
    const event = scrubEvent({
      user: { id: 'u1', email: 'a@b.c', ip_address: '1.2.3.4' },
      request: { url: 'https://p.test/work?search=0555', headers: { Authorization: 'Bearer abc', Referer: 'https://p.test/?q=x' }, cookies: { s: '1' } },
      exception: { values: [{ type: 'Error', value: 'failed with Bearer abc' }] },
    } as Event)
    expect(event.user).toEqual({ id: 'u1' })
    expect(event.request).toEqual({ url: 'https://p.test/work?search=[Filtered]', headers: { Authorization: '[Filtered]', Referer: 'https://p.test/?q=[Filtered]' } })
    expect(event.exception?.values?.[0]?.value).toBe('failed with Bearer [Filtered]')
  })

  it('groups page loads by route', () => {
    expect(spanName('/work/3f2a1b4c-1111-2222-3333-444455556666/quote')).toBe('/work/:id/quote')
    expect(spanName('/settlements/42')).toBe('/settlements/:id')
    expect(spanName('/team/members')).toBe('/team/members')
  })
})

describe('initSentry', () => {
  it('starts the SDK with tracing, the app release and no PII', async () => {
    // No network in tests: the SDK posts a session envelope on init.
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetch)
    const report = initSentry('https://key@o0.ingest.sentry.io/0')
    const options = Sentry.getClient()?.getOptions()
    expect(options?.release).toBe(`siana-provider@${__APP_VERSION__}`)
    expect(options?.sendDefaultPii).toBe(false)
    expect(options?.tracesSampleRate).toBe(0.1)
    expect(options?.tracePropagationTargets).toEqual([])
    expect(options?.integrations.map((i) => i.name)).toContain('BrowserTracing')
    expect(typeof report).toBe('function')
    report(new Error('boom'), 'at Page')
    await Sentry.flush(1000)
    const body = fetch.mock.calls.map(([, init]) => String(init?.body)).join('\n')
    expect(body).toContain('"value":"boom"')
    expect(body).toContain('at Page')
    await Sentry.close(0)
    vi.unstubAllGlobals()
  })
})
