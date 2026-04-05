import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  Service,
  ListServicesResponse,
  CreateServiceRequest,
  UpdateServiceRequest,
  ListPresetsResponse,
} from './types.js'

/** Options accepted by service methods that support per-call org scoping. */
export interface ServiceMethodOptions {
  /**
   * Override the client-level `organizationId` for this call only.
   * Sends `X-Active-Org-ID: {organizationId}` on the request.
   */
  organizationId?: string
}

/**
 * Manages FoundryDB managed services (database clusters).
 */
export class ServicesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all managed services.
   */
  async list(options?: ServiceMethodOptions): Promise<ListServicesResponse> {
    const raw = await this.http.get<unknown>('/managed-services/', undefined, options?.organizationId)
    return toCamel<ListServicesResponse>(raw)
  }

  /**
   * Create a new managed service.
   *
   * The `organizationId` field in `req` (if set) overrides the client-level default.
   */
  async create(req: CreateServiceRequest): Promise<Service> {
    const { organizationId, ...rest } = req
    const body = toSnake(rest)
    const raw = await this.http.post<unknown>('/managed-services/', body, organizationId)
    return toCamel<Service>(raw)
  }

  /**
   * Get a specific managed service by ID.
   */
  async get(serviceId: string, options?: ServiceMethodOptions): Promise<Service> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}`, undefined, options?.organizationId)
    return toCamel<Service>(raw)
  }

  /**
   * Update a managed service.
   */
  async update(serviceId: string, req: UpdateServiceRequest, options?: ServiceMethodOptions): Promise<Service> {
    const body = toSnake(req)
    const raw = await this.http.patch<unknown>(`/managed-services/${serviceId}`, body, options?.organizationId)
    return toCamel<Service>(raw)
  }

  /**
   * Delete a managed service.
   */
  async delete(serviceId: string, options?: ServiceMethodOptions): Promise<void> {
    await this.http.delete(`/managed-services/${serviceId}`, options?.organizationId)
  }

  /**
   * List available service presets.
   *
   * Presets are pre-configured service templates optimised for common use
   * cases such as AI agent session caches or conversation history stores.
   */
  async listPresets(options?: ServiceMethodOptions): Promise<ListPresetsResponse> {
    const raw = await this.http.get<unknown>('/managed-services/presets', undefined, options?.organizationId)
    return toCamel<ListPresetsResponse>(raw)
  }
}
