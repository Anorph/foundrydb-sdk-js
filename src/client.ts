import type { FoundryDBConfig, APIErrorBody } from './types.js'
import { FoundryDBError } from './types.js'
import { ServicesAPI } from './services.js'
import { UsersAPI } from './users.js'
import { BackupsAPI } from './backups.js'
import { MonitoringAPI } from './monitoring.js'

/**
 * Internal HTTP client used by all API modules.
 */
export class HTTPClient {
  private readonly baseUrl: string
  private readonly authHeader: string
  private readonly timeoutMs: number

  constructor(config: FoundryDBConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '')
    this.authHeader =
      'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64')
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`

    if (query) {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v))
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    }

    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      let errorBody: APIErrorBody = {}
      try {
        errorBody = (await response.json()) as APIErrorBody
      } catch {
        // ignore parse errors — leave errorBody empty
      }
      const message =
        errorBody.error ?? errorBody.message ?? `HTTP ${response.status} ${response.statusText}`
      throw new FoundryDBError(message, response.status, errorBody)
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as unknown as T
    }

    return (await response.json()) as T
  }

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, query)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}

// ---- Camel-case conversion helpers ----

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertKeys(obj: unknown, converter: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeys(item, converter))
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[converter(key)] = convertKeys(value, converter)
    }
    return result
  }
  return obj
}

export function toCamel<T>(obj: unknown): T {
  return convertKeys(obj, snakeToCamel) as T
}

export function toSnake<T>(obj: unknown): T {
  return convertKeys(obj, camelToSnake) as T
}

/**
 * FoundryDB client — entry point for the SDK.
 *
 * @example
 * ```typescript
 * import { FoundryDB } from '@foundrydb/sdk'
 *
 * const client = new FoundryDB({
 *   apiUrl: 'https://api.foundrydb.com',
 *   username: 'admin',
 *   password: 'admin',
 * })
 *
 * const { services } = await client.services.list()
 * ```
 */
export class FoundryDB {
  readonly services: ServicesAPI
  readonly users: UsersAPI
  readonly backups: BackupsAPI
  readonly monitoring: MonitoringAPI

  constructor(config: FoundryDBConfig) {
    const http = new HTTPClient(config)
    this.services = new ServicesAPI(http)
    this.users = new UsersAPI(http)
    this.backups = new BackupsAPI(http)
    this.monitoring = new MonitoringAPI(http)
  }
}
