import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  EdgeDomain,
  ListEdgeDomainsResponse,
  CreateEdgeDomainRequest,
  EdgeStatus,
  EdgeSettingsRequest,
  EdgeSettings,
} from './types.js'

/**
 * Manages the edge gateway surface for app services: custom domains, TLS
 * certificates, cache rules, rate limiting, and WAF mode.
 *
 * All methods are scoped to one app service identified by `appServiceId`.
 */
export class EdgeAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all custom domains attached to the given app service.
   */
  async listAppDomains(appServiceId: string): Promise<EdgeDomain[]> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/domains`)
    const result = toCamel<ListEdgeDomainsResponse>(raw)
    return result.domains
  }

  /**
   * Add a custom domain to an app service. The domain is created in
   * pending_verification status; call {@link verifyAppDomain} to trigger an
   * immediate verification pass, or wait for the background worker.
   */
  async createAppDomain(
    appServiceId: string,
    req: CreateEdgeDomainRequest,
  ): Promise<EdgeDomain> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/domains`, body)
    return toCamel<EdgeDomain>(raw)
  }

  /**
   * Requeue a pending or failed domain for an immediate verification pass.
   * Returns void on success (the server responds 202 Accepted with no body).
   */
  async verifyAppDomain(appServiceId: string, domainId: string): Promise<void> {
    await this.http.post(`/app-services/${appServiceId}/domains/${domainId}/verify`)
  }

  /**
   * Remove a custom domain from an app service. A missing domain (404) is
   * treated as a successful no-op.
   */
  async deleteAppDomain(appServiceId: string, domainId: string): Promise<void> {
    await this.http.delete(`/app-services/${appServiceId}/domains/${domainId}`)
  }

  /**
   * Get the edge overview for an app service: whether the edge tier is
   * enabled, the home PoP, CNAME target, desired-state config version, and
   * per-PoP convergence status.
   */
  async getAppEdgeStatus(appServiceId: string): Promise<EdgeStatus> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/edge`)
    return toCamel<EdgeStatus>(raw)
  }

  /**
   * Replace the customer-tunable edge settings (cache rules, rate limit, WAF
   * mode) for an app service. Domains and origin are platform-derived and
   * cannot be set here. Returns the updated settings plus the config version
   * the fleet will converge on.
   */
  async updateAppEdgeSettings(
    appServiceId: string,
    settings: EdgeSettingsRequest,
  ): Promise<EdgeSettings> {
    const body = toSnake(settings)
    const raw = await this.http.put<unknown>(`/app-services/${appServiceId}/edge/settings`, body)
    return toCamel<EdgeSettings>(raw)
  }
}
