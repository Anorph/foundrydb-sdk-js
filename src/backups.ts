import type { HTTPClient } from './client.js'
import { toCamel } from './client.js'
import type { ListBackupsResponse, TriggerBackupResponse } from './types.js'

/**
 * Manages backups for a service.
 */
export class BackupsAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all backups for a service.
   */
  async list(serviceId: string): Promise<ListBackupsResponse> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}/backups`)
    return toCamel<ListBackupsResponse>(raw)
  }

  /**
   * Trigger an on-demand backup for a service.
   */
  async trigger(serviceId: string): Promise<TriggerBackupResponse> {
    const raw = await this.http.post<unknown>(`/managed-services/${serviceId}/backups`)
    return toCamel<TriggerBackupResponse>(raw)
  }
}
