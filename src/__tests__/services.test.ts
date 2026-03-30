import { ServicesAPI } from '../services'
import { HTTPClient } from '../client'
import { FoundryDBError } from '../types'
import type { Service, ListServicesResponse } from '../types'

const BASE_CONFIG = {
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'secret',
}

function makeHttpClient(): HTTPClient {
  return new HTTPClient(BASE_CONFIG)
}

function mockFetch(body: unknown, status = 200): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Internal Server Error',
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  })
  globalThis.fetch = fetchMock
  return fetchMock
}

const MOCK_SERVICE_RAW = {
  id: 'svc_1',
  name: 'my-db',
  database_type: 'postgresql',
  version: '17',
  status: 'running',
  plan_name: 'tier-2',
  zone: 'se-sto1',
  storage_size_gb: 50,
  storage_tier: 'maxiops',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

const MOCK_SERVICE_CAMEL: Service = {
  id: 'svc_1',
  name: 'my-db',
  databaseType: 'postgresql',
  version: '17',
  status: 'running',
  planName: 'tier-2',
  zone: 'se-sto1',
  storageSizeGb: 50,
  storageTier: 'maxiops',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
}

describe('ServicesAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('list', () => {
    it('GETs /managed-services/ and returns camelCase response', async () => {
      const fetchMock = mockFetch({ services: [MOCK_SERVICE_RAW] })
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      const result: ListServicesResponse = await api.list()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/')
      expect(result.services).toHaveLength(1)
      expect(result.services[0]).toMatchObject(MOCK_SERVICE_CAMEL)
    })

    it('passes organizationId as X-Active-Org-ID header', async () => {
      const fetchMock = mockFetch({ services: [] })
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.list({ organizationId: 'org_123' })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_123')
    })

    it('works without options (no X-Active-Org-ID)', async () => {
      const fetchMock = mockFetch({ services: [] })
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.list()

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBeUndefined()
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'internal server error' }, 500)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.list()).rejects.toThrow(FoundryDBError)
      await expect(api.list()).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('get', () => {
    it('GETs /managed-services/{id} and returns camelCase service', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      const result = await api.get('svc_1')

      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1')
      expect(result).toMatchObject(MOCK_SERVICE_CAMEL)
    })

    it('passes organizationId option', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.get('svc_1', { organizationId: 'org_xyz' })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_xyz')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.get('bad_id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.get('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('create', () => {
    it('POSTs to /managed-services/ with snake_case body', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      const result = await api.create({
        name: 'my-db',
        databaseType: 'postgresql',
        version: '17',
        planName: 'tier-2',
        zone: 'se-sto1',
        storageSizeGb: 50,
        storageTier: 'maxiops',
      })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/')
      const body = JSON.parse(init.body as string)
      expect(body).toMatchObject({
        name: 'my-db',
        database_type: 'postgresql',
        version: '17',
        plan_name: 'tier-2',
        zone: 'se-sto1',
        storage_size_gb: 50,
        storage_tier: 'maxiops',
      })
      expect(result).toMatchObject(MOCK_SERVICE_CAMEL)
    })

    it('extracts organizationId from request and sends as header', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.create({
        name: 'my-db',
        databaseType: 'postgresql',
        version: '17',
        planName: 'tier-2',
        zone: 'se-sto1',
        storageSizeGb: 50,
        storageTier: 'maxiops',
        organizationId: 'org_create',
      })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_create')
      // organizationId should not appear in body
      const body = JSON.parse(init.body as string)
      expect(body.organization_id).toBeUndefined()
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'failed' }, 500)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(
        api.create({
          name: 'x',
          databaseType: 'postgresql',
          version: '17',
          planName: 'tier-2',
          zone: 'se-sto1',
          storageSizeGb: 50,
          storageTier: 'maxiops',
        }),
      ).rejects.toMatchObject({ statusCode: 500 })
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(
        api.create({
          name: 'x',
          databaseType: 'postgresql',
          version: '17',
          planName: 'tier-2',
          zone: 'se-sto1',
          storageSizeGb: 50,
          storageTier: 'maxiops',
        }),
      ).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('update', () => {
    it('PATCHes /managed-services/{id} with snake_case body', async () => {
      const fetchMock = mockFetch({ ...MOCK_SERVICE_RAW, name: 'renamed' })
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      const result = await api.update('svc_1', { name: 'renamed' })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('PATCH')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1')
      const body = JSON.parse(init.body as string)
      expect(body).toEqual({ name: 'renamed' })
      expect(result.name).toBe('renamed')
    })

    it('converts camelCase update fields to snake_case', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.update('svc_1', { storageSizeGb: 100, maintenanceWindow: 'sun:02:00' })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.storage_size_gb).toBe(100)
      expect(body.maintenance_window).toBe('sun:02:00')
    })

    it('passes organizationId option', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.update('svc_1', { name: 'x' }, { organizationId: 'org_upd' })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_upd')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.update('bad', {})).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'error' }, 500)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.update('svc_1', {})).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('delete', () => {
    it('DELETEs /managed-services/{id}', async () => {
      const fetchMock = mockFetch(null, 204)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.delete('svc_1')

      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('DELETE')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1')
    })

    it('passes organizationId option', async () => {
      const fetchMock = mockFetch(null, 204)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await api.delete('svc_1', { organizationId: 'org_del' })

      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_del')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.delete('bad')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'error' }, 500)
      const http = makeHttpClient()
      const api = new ServicesAPI(http)

      await expect(api.delete('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })
})
