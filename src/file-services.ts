import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  FilesService,
  CreateFilesServiceRequest,
  FilesAccessKey,
  FilesAccessKeyWithSecret,
  CreateFilesAccessKeyRequest,
  PresignFilesUrlRequest,
  FilesPresignedUrl,
  FilesObjectPage,
} from './types.js'

interface ListFilesServicesResponse {
  fileServices: FilesService[]
}

interface ListFilesAccessKeysResponse {
  keys: FilesAccessKey[]
}

/**
 * Manages files services (managed S3-compatible object storage buckets) and
 * their scoped access keys.
 */
export class FileServicesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all files services visible to the authenticated user.
   */
  async list(): Promise<FilesService[]> {
    const raw = await this.http.get<unknown>('/file-services')
    const result = toCamel<ListFilesServicesResponse>(raw)
    return result.fileServices
  }

  /**
   * Get the files service with the given ID, including bucket configuration,
   * quotas, and measured usage. Returns `null` when it does not exist (404).
   */
  async get(serviceId: string): Promise<FilesService | null> {
    try {
      const raw = await this.http.get<unknown>(`/file-services/${serviceId}`)
      return toCamel<FilesService>(raw)
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'statusCode' in err &&
        (err as { statusCode: number }).statusCode === 404
      ) {
        return null
      }
      throw err
    }
  }

  /**
   * Provision a new files service (an S3-compatible bucket). The service is
   * created in the Pending status; poll `waitForRunning` until the bucket is
   * ready.
   */
  async create(req: CreateFilesServiceRequest): Promise<FilesService> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/file-services', body)
    return toCamel<FilesService>(raw)
  }

  /**
   * Delete a files service: the bucket contents, the bucket itself, and every
   * credential minted for the service are removed. A missing service (404) is
   * treated as a successful no-op.
   */
  async delete(serviceId: string): Promise<void> {
    await this.http.delete(`/file-services/${serviceId}`)
  }

  // ---- Access keys ----

  /**
   * Mint a new scoped S3 credential for the files service. The `secretAccessKey`
   * in the response is returned exactly once; store it immediately as it cannot
   * be retrieved again. Key creation is blocked while the service is over its
   * hard storage quota.
   */
  async createAccessKey(
    serviceId: string,
    req: CreateFilesAccessKeyRequest,
  ): Promise<FilesAccessKeyWithSecret> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/file-services/${serviceId}/keys`, body)
    return toCamel<FilesAccessKeyWithSecret>(raw)
  }

  /**
   * List the service's access keys. Secret halves are never included; they
   * are returned only by `createAccessKey`.
   */
  async listAccessKeys(serviceId: string): Promise<FilesAccessKey[]> {
    const raw = await this.http.get<unknown>(`/file-services/${serviceId}/keys`)
    const result = toCamel<ListFilesAccessKeysResponse>(raw)
    return result.keys
  }

  /**
   * Revoke one access key. The provider credential is deleted and the stored
   * secret is destroyed. Revocation is permanent; mint a new key to restore
   * access.
   */
  async revokeAccessKey(serviceId: string, keyId: string): Promise<void> {
    await this.http.delete(`/file-services/${serviceId}/keys/${keyId}`)
  }

  // ---- Presigned URLs ----

  /**
   * Presign one S3 operation against the service's bucket. The returned URL
   * is used directly against the bucket endpoint without further credentials,
   * until it expires. Upload (PUT) presigning is blocked while the service is
   * over its hard storage quota.
   */
  async presignUrl(
    serviceId: string,
    req: PresignFilesUrlRequest,
  ): Promise<FilesPresignedUrl> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/file-services/${serviceId}/presign`, body)
    return toCamel<FilesPresignedUrl>(raw)
  }

  // ---- Object listing ----

  /**
   * List one page of the bucket's objects. `prefix` filters by key prefix;
   * `cursor` continues a previous listing from the returned `nextCursor`;
   * `max` caps the page size (0 applies the platform default of 100, maximum
   * 1000).
   */
  async listObjects(
    serviceId: string,
    prefix = '',
    cursor = '',
    max = 0,
  ): Promise<FilesObjectPage> {
    const query: Record<string, string | number | undefined> = {}
    if (prefix) query['prefix'] = prefix
    if (cursor) query['cursor'] = cursor
    if (max > 0) query['max'] = max
    const raw = await this.http.get<unknown>(`/file-services/${serviceId}/objects`, query)
    return toCamel<FilesObjectPage>(raw)
  }

  /**
   * Remove one object from the service's bucket.
   */
  async deleteObject(serviceId: string, key: string): Promise<void> {
    await this.http.delete(
      `/file-services/${serviceId}/objects?key=${encodeURIComponent(key)}`,
    )
  }

  // ---- Utility ----

  /**
   * Poll the files service until it reaches "Running" status or the timeout
   * expires. Throws when the service enters a terminal failure state or when
   * the timeout is exceeded. Poll interval is 5 seconds.
   */
  async waitForRunning(serviceId: string, timeoutMs = 120_000): Promise<FilesService> {
    const deadline = Date.now() + timeoutMs
    while (true) {
      const service = await this.get(serviceId)
      if (!service) {
        throw new Error(
          `foundrydb: files service ${serviceId} not found while waiting for running status`,
        )
      }
      const status = service.status.toLowerCase()
      if (status === 'running') {
        return service
      }
      if (status.includes('failed') || status === 'error') {
        throw new Error(
          `foundrydb: files service ${serviceId} entered terminal status "${service.status}"`,
        )
      }
      if (Date.now() > deadline) {
        throw new Error(
          `foundrydb: timed out waiting for files service ${serviceId} to reach running status (current: ${service.status})`,
        )
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 5_000))
    }
  }
}
