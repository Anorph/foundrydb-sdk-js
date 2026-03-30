import { OrganizationsAPI } from '../organizations'
import { HTTPClient } from '../client'
import { FoundryDBError } from '../types'
import type { Organization, ListOrganizationsResponse } from '../types'

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

const MOCK_ORG_RAW = {
  id: 'org_1',
  name: 'Acme Corp',
  slug: 'acme',
  is_personal: false,
  created_at: '2024-01-01T00:00:00Z',
}

const MOCK_ORG_CAMEL: Organization = {
  id: 'org_1',
  name: 'Acme Corp',
  slug: 'acme',
  isPersonal: false,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('OrganizationsAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('list', () => {
    it('GETs /organizations/ and returns camelCase response', async () => {
      const fetchMock = mockFetch({ organizations: [MOCK_ORG_RAW] })
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      const result: ListOrganizationsResponse = await api.list()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/organizations/')
      expect(result.organizations).toHaveLength(1)
      expect(result.organizations[0]).toMatchObject(MOCK_ORG_CAMEL)
    })

    it('returns empty organizations array', async () => {
      mockFetch({ organizations: [] })
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      const result = await api.list()

      expect(result.organizations).toEqual([])
    })

    it('converts is_personal to isPersonal', async () => {
      mockFetch({ organizations: [{ ...MOCK_ORG_RAW, is_personal: true }] })
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      const result = await api.list()

      expect(result.organizations[0].isPersonal).toBe(true)
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'internal server error' }, 500)
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      await expect(api.list()).rejects.toThrow(FoundryDBError)
      await expect(api.list()).rejects.toMatchObject({ statusCode: 500 })
    })

    it('throws FoundryDBError on 401', async () => {
      mockFetch({ error: 'unauthorized' }, 401)
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      await expect(api.list()).rejects.toMatchObject({
        statusCode: 401,
        message: 'unauthorized',
      })
    })
  })

  describe('get', () => {
    it('GETs /organizations/{id} and returns camelCase org', async () => {
      const fetchMock = mockFetch(MOCK_ORG_RAW)
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      const result: Organization = await api.get('org_1')

      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/organizations/org_1')
      expect(result).toMatchObject(MOCK_ORG_CAMEL)
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      await expect(api.get('bad_id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new OrganizationsAPI(http)

      await expect(api.get('org_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })
})
