import { EdgeAPI } from '../edge'
import { HTTPClient } from '../client'
import type { EdgeDomain, EdgeStatus, EdgeSettings } from '../types'

const BASE_CONFIG = {
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'secret',
}

function makeApi(): EdgeAPI {
  return new EdgeAPI(new HTTPClient(BASE_CONFIG))
}

function mockFetch(body: unknown, status = 200): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'mock',
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  })
  globalThis.fetch = fetchMock
  return fetchMock
}

const MOCK_DOMAIN_RAW = {
  id: 'dom_1',
  service_id: 'app_1',
  user_id: 'usr_1',
  domain: 'app.example.com',
  status: 'pending_verification',
  certificate_id: null,
  verification_checked_at: null,
  error_message: null,
  cname_target: 'edge.foundrydb.com',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

const MOCK_EDGE_STATUS_RAW = {
  edge_enabled: true,
  home_pop: 'se-sto1',
  cname_target: 'edge.foundrydb.com',
  config_version: 7,
  applications: [
    { zone: 'se-sto1', applied_version: 7, status: 'converged', error_message: '' },
    { zone: 'de-fra1', applied_version: 6, status: 'applying', error_message: '' },
  ],
}

const MOCK_EDGE_SETTINGS_RAW = {
  cache_rules: [{ path_prefix: '/static', ttl_seconds: 86400 }],
  rate_limit: { requests_per_second: 100, burst: 200, key: 'ip' },
  waf_mode: 'detect',
  config_version: 8,
}

describe('EdgeAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('listAppDomains', () => {
    it('GETs /app-services/{id}/domains and returns camelCase array', async () => {
      const fetchMock = mockFetch({ domains: [MOCK_DOMAIN_RAW] })
      const api = makeApi()

      const domains: EdgeDomain[] = await api.listAppDomains('app_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/app-services/app_1/domains',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET')
      expect(domains).toHaveLength(1)
      const d = domains[0]
      expect(d.id).toBe('dom_1')
      expect(d.serviceId).toBe('app_1')
      expect(d.userId).toBe('usr_1')
      expect(d.domain).toBe('app.example.com')
      expect(d.status).toBe('pending_verification')
      expect(d.cnameTarget).toBe('edge.foundrydb.com')
      expect(d.createdAt).toBe('2026-01-01T00:00:00Z')
    })

    it('returns an empty array when the domains list is empty', async () => {
      mockFetch({ domains: [] })
      const domains = await makeApi().listAppDomains('app_1')
      expect(domains).toEqual([])
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().listAppDomains('bad')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('createAppDomain', () => {
    it('POSTs snake_case body and returns camelCase EdgeDomain', async () => {
      const fetchMock = mockFetch(MOCK_DOMAIN_RAW, 201)
      const api = makeApi()

      const domain: EdgeDomain = await api.createAppDomain('app_1', {
        domain: 'app.example.com',
      })

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/app-services/app_1/domains',
      )
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body as string)
      expect(body).toEqual({ domain: 'app.example.com' })
      expect(domain.id).toBe('dom_1')
      expect(domain.serviceId).toBe('app_1')
      expect(domain.cnameTarget).toBe('edge.foundrydb.com')
    })

    it('throws FoundryDBError on 409 domain conflict', async () => {
      mockFetch({ error: 'domain already registered' }, 409)
      await expect(
        makeApi().createAppDomain('app_1', { domain: 'app.example.com' }),
      ).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('verifyAppDomain', () => {
    it('POSTs to /domains/{domainId}/verify with no body', async () => {
      const fetchMock = mockFetch(undefined, 202)
      await makeApi().verifyAppDomain('app_1', 'dom_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/app-services/app_1/domains/dom_1/verify',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().verifyAppDomain('app_1', 'bad')).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  describe('deleteAppDomain', () => {
    it('DELETEs /domains/{domainId}', async () => {
      const fetchMock = mockFetch(undefined, 204)
      await makeApi().deleteAppDomain('app_1', 'dom_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/app-services/app_1/domains/dom_1',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
    })
  })

  describe('getAppEdgeStatus', () => {
    it('GETs /app-services/{id}/edge and returns camelCase EdgeStatus', async () => {
      const fetchMock = mockFetch(MOCK_EDGE_STATUS_RAW)
      const api = makeApi()

      const status: EdgeStatus = await api.getAppEdgeStatus('app_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/app-services/app_1/edge',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET')
      expect(status.edgeEnabled).toBe(true)
      expect(status.homePop).toBe('se-sto1')
      expect(status.cnameTarget).toBe('edge.foundrydb.com')
      expect(status.configVersion).toBe(7)
      expect(status.applications).toHaveLength(2)
      expect(status.applications![0].zone).toBe('se-sto1')
      expect(status.applications![0].appliedVersion).toBe(7)
      expect(status.applications![0].status).toBe('converged')
      expect(status.applications![1].status).toBe('applying')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().getAppEdgeStatus('bad')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('updateAppEdgeSettings', () => {
    it('PUTs snake_case body and returns camelCase EdgeSettings', async () => {
      const fetchMock = mockFetch(MOCK_EDGE_SETTINGS_RAW)
      const api = makeApi()

      const result: EdgeSettings = await api.updateAppEdgeSettings('app_1', {
        cacheRules: [{ pathPrefix: '/static', ttlSeconds: 86400 }],
        rateLimit: { requestsPerSecond: 100, burst: 200, key: 'ip' },
        wafMode: 'detect',
      })

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/app-services/app_1/edge/settings',
      )
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('PUT')
      const body = JSON.parse(init.body as string)
      expect(body.cache_rules).toEqual([{ path_prefix: '/static', ttl_seconds: 86400 }])
      expect(body.rate_limit).toEqual({ requests_per_second: 100, burst: 200, key: 'ip' })
      expect(body.waf_mode).toBe('detect')

      expect(result.cacheRules).toEqual([{ pathPrefix: '/static', ttlSeconds: 86400 }])
      expect(result.rateLimit?.requestsPerSecond).toBe(100)
      expect(result.rateLimit?.burst).toBe(200)
      expect(result.rateLimit?.key).toBe('ip')
      expect(result.wafMode).toBe('detect')
      expect(result.configVersion).toBe(8)
    })

    it('sends only wafMode when other fields are omitted', async () => {
      const fetchMock = mockFetch({ waf_mode: 'off', config_version: 9 })
      await makeApi().updateAppEdgeSettings('app_1', { wafMode: 'off' })

      const body = JSON.parse(
        ((fetchMock.mock.calls[0][1] as RequestInit).body as string),
      )
      expect(body).toEqual({ waf_mode: 'off' })
    })

    it('throws FoundryDBError on 422', async () => {
      mockFetch({ error: 'invalid settings' }, 422)
      await expect(
        makeApi().updateAppEdgeSettings('app_1', { wafMode: 'off' }),
      ).rejects.toMatchObject({ statusCode: 422 })
    })
  })
})
