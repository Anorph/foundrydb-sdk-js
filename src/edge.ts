import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  EdgeDomain,
  ListEdgeDomainsResponse,
  CreateEdgeDomainRequest,
  EdgeStatus,
  EdgeSettingsRequest,
  EdgeSettings,
  EdgeCachePurgeRequest,
  EdgeCachePurgeResponse,
  EdgeAnalytics,
  EdgeLogDrain,
  ListEdgeLogDrainsResponse,
  CreateEdgeLogDrainRequest,
  UpdateEdgeLogDrainRequest,
  EdgeLogDrainTestResult,
  EdgeConfigVersions,
  EdgeRollbackRequest,
  EdgeRollbackResponse,
  EdgeRolloutStatus,
  EdgeRolloutAbortRequest,
} from './types.js'

/**
 * Manages the edge gateway surface for app services: custom domains, TLS
 * certificates, cache rules, rate limiting, WAF, access/auth, security
 * hardening, cache purge, analytics, access-log drains, and the config
 * version history (rollback) and staged rollouts.
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
   * Get the customer-tunable edge settings currently stored for an app service,
   * plus the desired-state config version the fleet converges on. Basic Auth
   * password hashes are never returned (only the enabled flag and usernames);
   * signed-URL and API-key auth are returned as their non-secret views.
   */
  async getAppEdgeSettings(appServiceId: string): Promise<EdgeSettings> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/edge/settings`)
    return toCamel<EdgeSettings>(raw)
  }

  /**
   * Replace the customer-tunable edge settings for an app service: cache rules
   * (with cache-depth), rate limit, WAF mode and hardening, access/auth
   * (JWT, signed URLs, API keys), DDoS/bot/account-takeover protection, the
   * rules engine, and more. Domains and origin are platform-derived and cannot
   * be set here. Plaintext key material (basic-auth and API-key passwords) is
   * write-only and never echoed. Returns the updated settings plus the config
   * version the fleet will converge on.
   */
  async updateAppEdgeSettings(
    appServiceId: string,
    settings: EdgeSettingsRequest,
  ): Promise<EdgeSettings> {
    const body = toSnake(settings)
    const raw = await this.http.put<unknown>(`/app-services/${appServiceId}/edge/settings`, body)
    return toCamel<EdgeSettings>(raw)
  }

  /**
   * Flush the app's edge cache across its serving PoP nodes, either entirely
   * (`req.all`) or for the listed absolute paths (`req.paths`); set exactly
   * one. The purge rolls across nodes one at a time in the background, so the
   * response reports the plan (planned node count and ids) rather than the
   * completed result.
   */
  async purgeAppEdgeCache(
    appServiceId: string,
    req: EdgeCachePurgeRequest,
  ): Promise<EdgeCachePurgeResponse> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/app-services/${appServiceId}/edge/cache/purge`,
      body,
    )
    return toCamel<EdgeCachePurgeResponse>(raw)
  }

  /**
   * Get the account-scoped edge analytics summary for an app over
   * `windowMinutes` (pass 0 or omit to use the server default of 60 minutes).
   * Covers the request status breakdown, error rate, cache hit ratio, latency
   * percentiles, rate-limited and WAF detection counts, top paths, and a
   * suspicious-path threat summary, folded across PoPs with a per-PoP breakdown.
   */
  async getAppEdgeAnalytics(
    appServiceId: string,
    windowMinutes?: number,
  ): Promise<EdgeAnalytics> {
    const query =
      windowMinutes && windowMinutes > 0 ? { window_minutes: windowMinutes } : undefined
    const raw = await this.http.get<unknown>(
      `/app-services/${appServiceId}/edge/analytics`,
      query,
    )
    return toCamel<EdgeAnalytics>(raw)
  }

  /**
   * List the app's edge access-log drains.
   */
  async listEdgeLogDrains(appServiceId: string): Promise<EdgeLogDrain[]> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/edge/log-drains`)
    const result = toCamel<ListEdgeLogDrainsResponse>(raw)
    return result.drains
  }

  /**
   * Create a new edge access-log drain for the app.
   */
  async createEdgeLogDrain(
    appServiceId: string,
    req: CreateEdgeLogDrainRequest,
  ): Promise<EdgeLogDrain> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/app-services/${appServiceId}/edge/log-drains`,
      body,
    )
    return toCamel<EdgeLogDrain>(raw)
  }

  /**
   * Get one edge access-log drain.
   */
  async getEdgeLogDrain(appServiceId: string, drainId: string): Promise<EdgeLogDrain> {
    const raw = await this.http.get<unknown>(
      `/app-services/${appServiceId}/edge/log-drains/${drainId}`,
    )
    return toCamel<EdgeLogDrain>(raw)
  }

  /**
   * Partially update an edge access-log drain; omitted fields keep their value.
   */
  async updateEdgeLogDrain(
    appServiceId: string,
    drainId: string,
    req: UpdateEdgeLogDrainRequest,
  ): Promise<EdgeLogDrain> {
    const body = toSnake(req)
    const raw = await this.http.put<unknown>(
      `/app-services/${appServiceId}/edge/log-drains/${drainId}`,
      body,
    )
    return toCamel<EdgeLogDrain>(raw)
  }

  /**
   * Delete an edge access-log drain, stopping all future exports for it.
   */
  async deleteEdgeLogDrain(appServiceId: string, drainId: string): Promise<void> {
    await this.http.delete(`/app-services/${appServiceId}/edge/log-drains/${drainId}`)
  }

  /**
   * Verify connectivity to the drain's destination without sending real log
   * data.
   */
  async testEdgeLogDrain(
    appServiceId: string,
    drainId: string,
  ): Promise<EdgeLogDrainTestResult> {
    const raw = await this.http.post<unknown>(
      `/app-services/${appServiceId}/edge/log-drains/${drainId}/test`,
    )
    return toCamel<EdgeLogDrainTestResult>(raw)
  }

  /**
   * List the append-only version history of an app service's edge configuration,
   * newest first, plus the live active version. Use it to find a version to roll
   * back to with {@link rollbackAppEdgeConfig}.
   */
  async listAppEdgeConfigVersions(appServiceId: string): Promise<EdgeConfigVersions> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/edge/versions`)
    return toCamel<EdgeConfigVersions>(raw)
  }

  /**
   * Roll an app service's edge configuration back to a prior version. Supply
   * exactly one of `req.toVersion` or `req.to = "previous"`. The rollback
   * restores the target version's customer-settable subset onto the live
   * configuration as a NEW forward version (keeping the current platform-derived
   * domains and origin); it never mutates the history. The fleet converges on
   * the new version asynchronously (poll {@link getAppEdgeStatus}).
   */
  async rollbackAppEdgeConfig(
    appServiceId: string,
    req: EdgeRollbackRequest,
  ): Promise<EdgeRollbackResponse> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/app-services/${appServiceId}/edge/rollback`,
      body,
    )
    return toCamel<EdgeRollbackResponse>(raw)
  }

  /**
   * Get the app service's current staged config rollout (the active one, or the
   * most recent terminal one), or `active: false` with no rollout when the app
   * has never had one. Canary rollouts are opened by the platform when the app's
   * edge settings enable `canaryRolloutEnabled` and a new config version is
   * produced.
   */
  async getAppEdgeRollout(appServiceId: string): Promise<EdgeRolloutStatus> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/edge/rollout`)
    return toCamel<EdgeRolloutStatus>(raw)
  }

  /**
   * Promote a holding canary rollout so the platform fans the canary version out
   * to the rest of the fleet. Only an active rollout in the canary phase can be
   * promoted.
   */
  async promoteAppEdgeRollout(appServiceId: string): Promise<void> {
    await this.http.post(`/app-services/${appServiceId}/edge/rollout/promote`)
  }

  /**
   * Abort an active rollout. The rest of the fleet was never given the target
   * version, so it keeps serving the prior version; the canary subset can be
   * recovered with {@link rollbackAppEdgeConfig}. `req.reason` is an optional
   * operator note.
   */
  async abortAppEdgeRollout(
    appServiceId: string,
    req: EdgeRolloutAbortRequest = {},
  ): Promise<void> {
    const body = toSnake(req)
    await this.http.post(`/app-services/${appServiceId}/edge/rollout/abort`, body)
  }
}
