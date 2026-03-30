import { MonitoringAPI } from '../monitoring'
import { HTTPClient } from '../client'
import { FoundryDBError } from '../types'
import type { ServiceMetrics, LogsTaskResponse, LogsResultResponse } from '../types'

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

const MOCK_METRICS_RAW = {
  cpu_usage_percent: 25.5,
  memory_usage_percent: 60.0,
  disk_usage_percent: 40.0,
  connections_active: 5,
  connections_max: 100,
  replication_lag_ms: 0,
  queries_per_second: 120.3,
}

const MOCK_LOGS_TASK_RAW = {
  task_id: 'task_abc',
}

describe('MonitoringAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('getMetrics', () => {
    it('GETs /managed-services/{id}/metrics/current and returns camelCase metrics', async () => {
      const fetchMock = mockFetch(MOCK_METRICS_RAW)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      const result: ServiceMetrics = await api.getMetrics('svc_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1/metrics/current')
      expect(result.cpuUsagePercent).toBe(25.5)
      expect(result.memoryUsagePercent).toBe(60.0)
      expect(result.diskUsagePercent).toBe(40.0)
      expect(result.connectionsActive).toBe(5)
      expect(result.connectionsMax).toBe(100)
      expect(result.replicationLagMs).toBe(0)
      expect(result.queriesPerSecond).toBe(120.3)
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.getMetrics('bad_id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.getMetrics('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('requestLogs', () => {
    it('POSTs to /managed-services/{id}/logs with default lines', async () => {
      const fetchMock = mockFetch(MOCK_LOGS_TASK_RAW)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      const result: LogsTaskResponse = await api.requestLogs('svc_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1/logs?lines=100')
      expect(result.taskId).toBe('task_abc')
    })

    it('uses custom lines parameter', async () => {
      const fetchMock = mockFetch(MOCK_LOGS_TASK_RAW)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await api.requestLogs('svc_1', 500)

      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/managed-services/svc_1/logs?lines=500')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.requestLogs('bad_id')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.requestLogs('svc_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('getLogs', () => {
    it('GETs /managed-services/{id}/logs with task_id query param', async () => {
      const fetchMock = mockFetch({ status: 'completed', logs: 'log line 1\nlog line 2' })
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      const result: LogsResultResponse = await api.getLogs('svc_1', 'task_abc')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/managed-services/svc_1/logs')
      expect(url).toContain('task_id=task_abc')
      expect(result.status).toBe('completed')
      expect(result.logs).toBe('log line 1\nlog line 2')
    })

    it('returns pending status when not yet complete', async () => {
      mockFetch({ status: 'pending', logs: '' })
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      const result = await api.getLogs('svc_1', 'task_abc')

      expect(result.status).toBe('pending')
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.getLogs('bad_id', 'task_abc')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws FoundryDBError on 500', async () => {
      mockFetch({ error: 'server error' }, 500)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.getLogs('svc_1', 'task_abc')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('fetchLogs', () => {
    it('requests logs and polls until completed', async () => {
      const fetchMock = jest
        .fn()
        // First call: requestLogs POST
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ task_id: 'task_poll' }),
        })
        // Second call: getLogs GET - pending
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ status: 'pending', logs: '' }),
        })
        // Third call: getLogs GET - completed
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ status: 'completed', logs: 'final log output' }),
        })
      globalThis.fetch = fetchMock

      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      const result = await api.fetchLogs('svc_1', {
        lines: 50,
        timeoutMs: 10_000,
        pollIntervalMs: 1, // minimal to avoid test delays
      })

      expect(result).toBe('final log output')
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('uses default lines=100 when not specified', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ task_id: 'task_def' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ status: 'completed', logs: 'log output' }),
        })
      globalThis.fetch = fetchMock

      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await api.fetchLogs('svc_1', { timeoutMs: 10_000, pollIntervalMs: 1 })

      // First call is the POST to requestLogs with lines=100
      const firstUrl = fetchMock.mock.calls[0][0] as string
      expect(firstUrl).toContain('lines=100')
    })

    it('throws when log retrieval times out', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => null },
        json: () => Promise.resolve({ task_id: 'task_timeout' }),
      })
      globalThis.fetch = fetchMock

      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      // Mock getLogs to always return pending so it times out
      jest.spyOn(api, 'getLogs').mockResolvedValue({ status: 'pending', logs: '' })
      jest.spyOn(api, 'requestLogs').mockResolvedValue({ taskId: 'task_timeout' })

      await expect(
        api.fetchLogs('svc_1', { timeoutMs: 10, pollIntervalMs: 1 }),
      ).rejects.toThrow('Log retrieval timed out after 10ms (task task_timeout)')
    })

    it('propagates errors from requestLogs', async () => {
      mockFetch({ error: 'service not found' }, 404)
      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      await expect(api.fetchLogs('bad_id', { timeoutMs: 5000, pollIntervalMs: 1 })).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('works with no options argument (uses all defaults)', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ task_id: 'task_noopt' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve({ status: 'completed', logs: 'default opts output' }),
        })
      globalThis.fetch = fetchMock

      const http = makeHttpClient()
      const api = new MonitoringAPI(http)

      // Override pollIntervalMs via spy to avoid waiting 2 seconds
      jest.spyOn(api, 'requestLogs').mockResolvedValue({ taskId: 'task_noopt' })
      jest.spyOn(api, 'getLogs').mockResolvedValue({ status: 'completed', logs: 'default opts output' })

      const result = await api.fetchLogs('svc_1')
      expect(result).toBe('default opts output')
    })
  })
})
