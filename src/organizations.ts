import type { HTTPClient } from './client.js'
import { toCamel } from './client.js'
import type { ListOrganizationsResponse, Organization } from './types.js'

/**
 * Manages organizations the authenticated user belongs to.
 */
export class OrganizationsAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all organizations the current user is a member of.
   *
   * @returns A list of organizations, including personal and team organizations.
   */
  async list(): Promise<ListOrganizationsResponse> {
    const raw = await this.http.get<unknown>('/organizations/')
    return toCamel<ListOrganizationsResponse>(raw)
  }

  /**
   * Get a specific organization by ID.
   */
  async get(organizationId: string): Promise<Organization> {
    const raw = await this.http.get<unknown>(`/organizations/${organizationId}`)
    return toCamel<Organization>(raw)
  }
}
