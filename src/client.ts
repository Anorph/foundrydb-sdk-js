import type { FoundryDBConfig, APIErrorBody } from './types.js'
import { FoundryDBError } from './types.js'
import { ServicesAPI } from './services.js'
import { UsersAPI } from './users.js'
import { BackupsAPI } from './backups.js'
import { MonitoringAPI } from './monitoring.js'
import { OrganizationsAPI } from './organizations.js'
import { AppServicesAPI } from './app-services.js'
import { AppJobsAPI } from './app-jobs.js'
import { EdgeAPI } from './edge.js'
import { QueuesAPI } from './queues.js'
import { FileServicesAPI } from './file-services.js'
import { InferenceAPI } from './inference.js'
import { DataPipelinesAPI } from './data-pipelines.js'
import { EmbeddingPipelinesAPI } from './embedding-pipelines.js'
import { WebhooksAPI } from './webhooks.js'
import { AIActionsAPI } from './ai-actions.js'
import { VectorSearchAPI } from './vector-search.js'
import { ComplianceAPI } from './compliance.js'
import { AttachmentsAPI } from './attachments.js'
import { StacksAPI } from './stacks.js'

/**
 * Internal HTTP client used by all API modules.
 */
export class HTTPClient {
  private readonly baseUrl: string
  private readonly authHeader: string
  private readonly timeoutMs: number
  /** Default organization ID applied to all requests as X-Active-Org-ID. */
  readonly defaultOrganizationId: string | undefined

  constructor(config: FoundryDBConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '')
    this.authHeader =
      'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64')
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.defaultOrganizationId = config.organizationId
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
    organizationId?: string,
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

    const effectiveOrgId = organizationId ?? this.defaultOrganizationId

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (effectiveOrgId) {
      headers['X-Active-Org-ID'] = effectiveOrgId
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

  async get<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
    organizationId?: string,
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, query, organizationId)
  }

  async post<T>(path: string, body?: unknown, organizationId?: string): Promise<T> {
    return this.request<T>('POST', path, body, undefined, organizationId)
  }

  async patch<T>(path: string, body: unknown, organizationId?: string): Promise<T> {
    return this.request<T>('PATCH', path, body, undefined, organizationId)
  }

  async put<T>(path: string, body: unknown, organizationId?: string): Promise<T> {
    return this.request<T>('PUT', path, body, undefined, organizationId)
  }

  async delete<T = void>(path: string, organizationId?: string): Promise<T> {
    return this.request<T>('DELETE', path, undefined, undefined, organizationId)
  }

  /**
   * Issue a GET and return the raw bytes as a Uint8Array. Used for binary
   * endpoints such as PDF downloads.
   */
  async getBinary(path: string, organizationId?: string): Promise<Uint8Array> {
    const url = `${this.baseUrl}${path}`
    const effectiveOrgId = organizationId ?? this.defaultOrganizationId

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
    }

    if (effectiveOrgId) {
      headers['X-Active-Org-ID'] = effectiveOrgId
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      let errorBody: APIErrorBody = {}
      try {
        errorBody = (await response.json()) as APIErrorBody
      } catch {
        // ignore parse errors
      }
      const message =
        errorBody.error ?? errorBody.message ?? `HTTP ${response.status} ${response.statusText}`
      throw new FoundryDBError(message, response.status, errorBody)
    }

    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * Issue a GET without authentication headers. Used for public well-known
   * endpoints such as compliance signing key discovery.
   */
  async getPublic<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      let errorBody: APIErrorBody = {}
      try {
        errorBody = (await response.json()) as APIErrorBody
      } catch {
        // ignore parse errors
      }
      const message =
        errorBody.error ?? errorBody.message ?? `HTTP ${response.status} ${response.statusText}`
      throw new FoundryDBError(message, response.status, errorBody)
    }

    return (await response.json()) as T
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
 *   // Optionally scope all requests to a specific organization:
 *   organizationId: 'org_abc123',
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
  readonly organizations: OrganizationsAPI
  readonly appServices: AppServicesAPI
  readonly appJobs: AppJobsAPI
  readonly edge: EdgeAPI
  readonly queues: QueuesAPI
  readonly fileServices: FileServicesAPI
  readonly inference: InferenceAPI
  readonly dataPipelines: DataPipelinesAPI
  readonly embeddingPipelines: EmbeddingPipelinesAPI
  readonly webhooks: WebhooksAPI
  readonly aiActions: AIActionsAPI
  readonly vectorSearch: VectorSearchAPI
  readonly compliance: ComplianceAPI
  readonly attachments: AttachmentsAPI
  readonly stacks: StacksAPI

  constructor(config: FoundryDBConfig) {
    const http = new HTTPClient(config)
    this.services = new ServicesAPI(http)
    this.users = new UsersAPI(http)
    this.backups = new BackupsAPI(http)
    this.monitoring = new MonitoringAPI(http)
    this.organizations = new OrganizationsAPI(http)
    this.appServices = new AppServicesAPI(http)
    this.appJobs = new AppJobsAPI(http)
    this.edge = new EdgeAPI(http)
    this.queues = new QueuesAPI(http)
    this.fileServices = new FileServicesAPI(http)
    this.inference = new InferenceAPI(http)
    this.dataPipelines = new DataPipelinesAPI(http)
    this.embeddingPipelines = new EmbeddingPipelinesAPI(http)
    this.webhooks = new WebhooksAPI(http)
    this.aiActions = new AIActionsAPI(http)
    this.vectorSearch = new VectorSearchAPI(http)
    this.compliance = new ComplianceAPI(http)
    this.attachments = new AttachmentsAPI(http)
    this.stacks = new StacksAPI(http)
  }
}
