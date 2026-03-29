import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  Service,
  ListServicesResponse,
  CreateServiceRequest,
  UpdateServiceRequest,
} from './types.js'

/**
 * Manages FoundryDB managed services (database clusters).
 */
export class ServicesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all managed services.
   */
  async list(): Promise<ListServicesResponse> {
    const raw = await this.http.get<unknown>('/managed-services/')
    return toCamel<ListServicesResponse>(raw)
  }

  /**
   * Create a new managed service.
   */
  async create(req: CreateServiceRequest): Promise<Service> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/managed-services/', body)
    return toCamel<Service>(raw)
  }

  /**
   * Get a specific managed service by ID.
   */
  async get(serviceId: string): Promise<Service> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}`)
    return toCamel<Service>(raw)
  }

  /**
   * Update a managed service.
   */
  async update(serviceId: string, req: UpdateServiceRequest): Promise<Service> {
    const body = toSnake(req)
    const raw = await this.http.patch<unknown>(`/managed-services/${serviceId}`, body)
    return toCamel<Service>(raw)
  }

  /**
   * Delete a managed service.
   */
  async delete(serviceId: string): Promise<void> {
    await this.http.delete(`/managed-services/${serviceId}`)
  }
}
