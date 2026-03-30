import { UsersAPI } from '../users'
import { HTTPClient } from '../client'
import { FoundryDBError } from '../types'
import type { ListUsersResponse, RevealPasswordResponse } from '../types'

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

const MOCK_USERS_RAW = {
  users: [
    {
      username: 'app_user',
      roles: ['readWrite'],
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
}

const MOCK_REVEAL_RAW = {
  username: 'app_user',
  password: 'super_secret',
  host: 'db.example.com',
  port: 5432,
  database: 'defaultdb',
  connection_string: 'postgresql://app_user:super_secret@db.example.com:5432/defaultdb',
}

describe('UsersAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('list', () => {
    it('GETs /managed-services/{id}/database-users and returns camelCase response', async () => {
      const fetchMock = mockFetch(MOCK_USERS_RAW)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      const result: ListUsersResponse = await api.list('svc_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1/database-users')
      expect(result.users).toHaveLength(1)
      expect(result.users[0].username).toBe('app_user')
      expect(result.users[0].createdAt).toBe('2024-01-01T00:00:00Z')
    })

    it('returns empty users array', async () => {
      mockFetch({ users: [] })
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      const result = await api.list('svc_1')

      expect(result.users).toEqual([])
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      await expect(api.list('bad_id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      await expect(api.list('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('revealPassword', () => {
    it('POSTs to /managed-services/{id}/database-users/{username}/reveal-password', async () => {
      const fetchMock = mockFetch(MOCK_REVEAL_RAW)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      const result: RevealPasswordResponse = await api.revealPassword('svc_1', 'app_user')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe(
        'https://api.foundrydb.com/managed-services/svc_1/database-users/app_user/reveal-password',
      )
      expect(result.username).toBe('app_user')
      expect(result.password).toBe('super_secret')
      expect(result.host).toBe('db.example.com')
      expect(result.port).toBe(5432)
      expect(result.database).toBe('defaultdb')
    })

    it('converts connection_string to connectionString', async () => {
      mockFetch(MOCK_REVEAL_RAW)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      const result = await api.revealPassword('svc_1', 'app_user')

      expect(result.connectionString).toBe(
        'postgresql://app_user:super_secret@db.example.com:5432/defaultdb',
      )
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      await expect(api.revealPassword('bad_svc', 'user')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new UsersAPI(http)

      await expect(api.revealPassword('svc_1', 'app_user')).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })
})
