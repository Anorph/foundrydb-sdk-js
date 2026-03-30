import { BackupsAPI } from '../backups'
import { HTTPClient } from '../client'
import { FoundryDBError } from '../types'
import type { ListBackupsResponse, TriggerBackupResponse } from '../types'

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

const MOCK_BACKUPS_RAW = {
  backups: [
    {
      id: 'bkp_1',
      service_id: 'svc_1',
      status: 'completed',
      backup_type: 'full',
      size_bytes: 1024 * 1024,
      created_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T00:05:00Z',
    },
  ],
}

const MOCK_TRIGGER_RAW = {
  backup_id: 'bkp_new',
}

describe('BackupsAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('list', () => {
    it('GETs /managed-services/{id}/backups and returns camelCase response', async () => {
      const fetchMock = mockFetch(MOCK_BACKUPS_RAW)
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      const result: ListBackupsResponse = await api.list('svc_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1/backups')
      expect(result.backups).toHaveLength(1)

      const backup = result.backups[0]
      expect(backup.id).toBe('bkp_1')
      expect(backup.serviceId).toBe('svc_1')
      expect(backup.status).toBe('completed')
      expect(backup.backupType).toBe('full')
      expect(backup.sizeBytes).toBe(1024 * 1024)
      expect(backup.createdAt).toBe('2024-01-01T00:00:00Z')
      expect(backup.completedAt).toBe('2024-01-01T00:05:00Z')
    })

    it('returns empty backups array', async () => {
      mockFetch({ backups: [] })
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      const result = await api.list('svc_1')

      expect(result.backups).toEqual([])
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      await expect(api.list('bad_id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      await expect(api.list('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('trigger', () => {
    it('POSTs to /managed-services/{id}/backups and returns camelCase response', async () => {
      const fetchMock = mockFetch(MOCK_TRIGGER_RAW)
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      const result: TriggerBackupResponse = await api.trigger('svc_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1/backups')
      expect(result.backupId).toBe('bkp_new')
    })

    it('converts backup_id to backupId', async () => {
      mockFetch({ backup_id: 'bkp_xyz' })
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      const result = await api.trigger('svc_1')

      expect(result.backupId).toBe('bkp_xyz')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      await expect(api.trigger('bad_id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new BackupsAPI(http)

      await expect(api.trigger('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })
})
