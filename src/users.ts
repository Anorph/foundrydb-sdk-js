import type { HTTPClient } from './client.js'
import { toCamel } from './client.js'
import type { ListUsersResponse, RevealPasswordResponse } from './types.js'

/**
 * Manages database users and credentials for a service.
 */
export class UsersAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all database users for a service.
   */
  async list(serviceId: string): Promise<ListUsersResponse> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}/database-users`)
    return toCamel<ListUsersResponse>(raw)
  }

  /**
   * Reveal the password and connection string for a database user.
   */
  async revealPassword(serviceId: string, username: string): Promise<RevealPasswordResponse> {
    const raw = await this.http.post<unknown>(
      `/managed-services/${serviceId}/database-users/${username}/reveal-password`,
    )
    return toCamel<RevealPasswordResponse>(raw)
  }
}
