import { HTTPClient, FoundryDB, convertKeys, toCamel, toSnake } from '../client'
import { FoundryDBError } from '../types'

// Helper to create a mock fetch response
function mockResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = { 'content-type': 'application/json' },
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Internal Server Error',
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function mockNetworkError(): never {
  throw new TypeError('fetch failed')
}

const BASE_CONFIG = {
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'secret',
}

describe('HTTPClient', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('constructor', () => {
    it('strips trailing slash from apiUrl', async () => {
      const client = new HTTPClient({ ...BASE_CONFIG, apiUrl: 'https://api.foundrydb.com/' })
      fetchMock.mockResolvedValue(mockResponse({ ok: true }))
      await client.get('/test')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/test')
    })

    it('uses default timeout of 30000ms when not specified', () => {
      const client = new HTTPClient(BASE_CONFIG)
      // defaultOrganizationId is undefined when not set
      expect(client.defaultOrganizationId).toBeUndefined()
    })

    it('stores organizationId as defaultOrganizationId', () => {
      const client = new HTTPClient({ ...BASE_CONFIG, organizationId: 'org_abc' })
      expect(client.defaultOrganizationId).toBe('org_abc')
    })

    it('sets Basic auth header from username:password', async () => {
      const client = new HTTPClient({ ...BASE_CONFIG, username: 'user', password: 'pass' })
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.get('/test')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      const expected = 'Basic ' + Buffer.from('user:pass').toString('base64')
      expect(headers['Authorization']).toBe(expected)
    })
  })

  describe('request method', () => {
    it('sends GET request to correct URL', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ data: 1 }))
      await client.request('GET', '/managed-services/')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.foundrydb.com/managed-services/')
    })

    it('appends query parameters to URL', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.request('GET', '/items', undefined, { page: 2, limit: 10 })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('page=2')
      expect(url).toContain('limit=10')
    })

    it('omits undefined query parameters', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.request('GET', '/items', undefined, { page: undefined, limit: 5 })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).not.toContain('page')
      expect(url).toContain('limit=5')
    })

    it('does not append query string when all params are undefined', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.request('GET', '/items', undefined, { page: undefined })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/items')
      expect(url).not.toContain('?')
    })

    it('sends Content-Type and Accept headers', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.get('/test')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Accept']).toBe('application/json')
    })

    it('does not set X-Active-Org-ID when no org ID provided', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.get('/test')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBeUndefined()
    })

    it('sets X-Active-Org-ID from defaultOrganizationId', async () => {
      const client = new HTTPClient({ ...BASE_CONFIG, organizationId: 'org_default' })
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.get('/test')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_default')
    })

    it('overrides defaultOrganizationId with per-request organizationId', async () => {
      const client = new HTTPClient({ ...BASE_CONFIG, organizationId: 'org_default' })
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.get('/test', undefined, 'org_override')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers['X-Active-Org-ID']).toBe('org_override')
    })

    it('serializes request body as JSON', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.post('/items', { name: 'test', count: 3 })
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.body).toBe(JSON.stringify({ name: 'test', count: 3 }))
    })

    it('does not set body when body is undefined', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}))
      await client.get('/test')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.body).toBeUndefined()
    })

    it('returns undefined for 204 No Content', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse(null, 204))
      const result = await client.delete('/items/1')
      expect(result).toBeUndefined()
    })

    it('returns undefined when content-length is 0', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(
        mockResponse(null, 200, { 'content-length': '0' }),
      )
      const result = await client.get('/test')
      expect(result).toBeUndefined()
    })

    it('parses and returns JSON response body', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ id: '123', name: 'db' }))
      const result = await client.get<{ id: string; name: string }>('/test')
      expect(result).toEqual({ id: '123', name: 'db' })
    })

    it('throws FoundryDBError on non-OK response with error field', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ error: 'not found' }, 404))
      await expect(client.get('/missing')).rejects.toThrow(FoundryDBError)
      await expect(client.get('/missing')).rejects.toMatchObject({
        statusCode: 404,
        message: 'not found',
      })
    })

    it('throws FoundryDBError on non-OK response with message field', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ message: 'server error' }, 500))
      await expect(client.get('/boom')).rejects.toMatchObject({
        statusCode: 500,
        message: 'server error',
      })
    })

    it('throws FoundryDBError with HTTP status text when body has no error/message', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({}, 503))
      await expect(client.get('/down')).rejects.toMatchObject({
        message: 'HTTP 503 Internal Server Error',
        statusCode: 503,
      })
    })

    it('throws FoundryDBError when JSON parse fails on error response', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
        json: () => Promise.reject(new SyntaxError('bad json')),
      } as unknown as Response)
      await expect(client.get('/bad-json-error')).rejects.toMatchObject({
        statusCode: 500,
        message: 'HTTP 500 Internal Server Error',
      })
    })

    it('propagates network errors from fetch', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))
      await expect(client.get('/test')).rejects.toThrow('fetch failed')
    })

    it('FoundryDBError has correct name and body', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ error: 'bad request', detail: 'x' }, 400))
      try {
        await client.get('/test')
        fail('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(FoundryDBError)
        const err = e as FoundryDBError
        expect(err.name).toBe('FoundryDBError')
        expect(err.body).toEqual({ error: 'bad request', detail: 'x' })
      }
    })
  })

  describe('get method', () => {
    it('calls request with GET and no body', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ items: [] }))
      await client.get('/items', { filter: 'active' })
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('GET')
      expect(init.body).toBeUndefined()
    })
  })

  describe('post method', () => {
    it('calls request with POST and body', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ id: '1' }))
      await client.post('/items', { name: 'test' })
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(init.body).toBe('{"name":"test"}')
    })
  })

  describe('patch method', () => {
    it('calls request with PATCH and body', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse({ id: '1' }))
      await client.patch('/items/1', { name: 'updated' })
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('PATCH')
      expect(init.body).toBe('{"name":"updated"}')
    })
  })

  describe('delete method', () => {
    it('calls request with DELETE and no body', async () => {
      const client = new HTTPClient(BASE_CONFIG)
      fetchMock.mockResolvedValue(mockResponse(null, 204))
      await client.delete('/items/1')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('DELETE')
      expect(init.body).toBeUndefined()
    })
  })
})

describe('convertKeys', () => {
  it('converts object keys with given converter', () => {
    const result = convertKeys({ foo_bar: 1, baz_qux: 'hello' }, (k) => k.toUpperCase())
    expect(result).toEqual({ FOO_BAR: 1, BAZ_QUX: 'hello' })
  })

  it('converts nested object keys recursively', () => {
    const result = convertKeys({ outer_key: { inner_key: 42 } }, (k) =>
      k.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()),
    )
    expect(result).toEqual({ outerKey: { innerKey: 42 } })
  })

  it('converts array elements recursively', () => {
    const result = convertKeys([{ foo_bar: 1 }, { baz_qux: 2 }], (k) =>
      k.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()),
    )
    expect(result).toEqual([{ fooBar: 1 }, { bazQux: 2 }])
  })

  it('returns primitive values unchanged', () => {
    expect(convertKeys(42, (k) => k)).toBe(42)
    expect(convertKeys('hello', (k) => k)).toBe('hello')
    expect(convertKeys(null, (k) => k)).toBeNull()
    expect(convertKeys(true, (k) => k)).toBe(true)
  })

  it('handles empty objects', () => {
    expect(convertKeys({}, (k) => k)).toEqual({})
  })

  it('handles empty arrays', () => {
    expect(convertKeys([], (k) => k)).toEqual([])
  })
})

describe('toCamel', () => {
  it('converts snake_case keys to camelCase', () => {
    const result = toCamel<{ fooBar: number; bazQux: string }>({
      foo_bar: 1,
      baz_qux: 'hello',
    })
    expect(result).toEqual({ fooBar: 1, bazQux: 'hello' })
  })

  it('handles nested objects', () => {
    const result = toCamel<{ outerKey: { innerKey: number } }>({
      outer_key: { inner_key: 42 },
    })
    expect(result).toEqual({ outerKey: { innerKey: 42 } })
  })

  it('handles arrays of objects', () => {
    const result = toCamel<Array<{ myField: number }>>([{ my_field: 1 }, { my_field: 2 }])
    expect(result).toEqual([{ myField: 1 }, { myField: 2 }])
  })
})

describe('toSnake', () => {
  it('converts camelCase keys to snake_case', () => {
    const result = toSnake<{ foo_bar: number; baz_qux: string }>({
      fooBar: 1,
      bazQux: 'hello',
    })
    expect(result).toEqual({ foo_bar: 1, baz_qux: 'hello' })
  })

  it('handles nested objects', () => {
    const result = toSnake<{ outer_key: { inner_key: number } }>({
      outerKey: { innerKey: 42 },
    })
    expect(result).toEqual({ outer_key: { inner_key: 42 } })
  })
})

describe('FoundryDB client', () => {
  it('instantiates with services, users, backups, monitoring, organizations', () => {
    const client = new FoundryDB(BASE_CONFIG)
    expect(client.services).toBeDefined()
    expect(client.users).toBeDefined()
    expect(client.backups).toBeDefined()
    expect(client.monitoring).toBeDefined()
    expect(client.organizations).toBeDefined()
  })
})

describe('FoundryDBError', () => {
  it('has correct name, statusCode, body, and message', () => {
    const err = new FoundryDBError('something went wrong', 422, { error: 'validation failed' })
    expect(err.name).toBe('FoundryDBError')
    expect(err.message).toBe('something went wrong')
    expect(err.statusCode).toBe(422)
    expect(err.body).toEqual({ error: 'validation failed' })
    expect(err).toBeInstanceOf(Error)
  })
})
