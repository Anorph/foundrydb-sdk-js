import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  AppService,
  AppContainerConfig,
  AppDeployment,
  AuthEnableRequest,
  AuthConfiguration,
  AuthConfigurationWithKeys,
  AuthSigningKey,
  RevokeSessionResponse,
} from './types.js'

/**
 * Options accepted by app-service methods that support per-call org scoping.
 */
export interface AppServiceMethodOptions {
  /**
   * Override the client-level `organizationId` for this call only.
   * Sends `X-Active-Org-ID: {organizationId}` on the request.
   */
  organizationId?: string
}

export interface CreateAppServiceRequest {
  name: string
  planName: string
  zone?: string
  appConfig: AppContainerConfig
  storageSizeGb?: number
  storageTier?: string
  attachedServiceIds?: string[]
  organizationId?: string
}

export interface UpdateAppServiceRequest {
  appConfig: AppContainerConfig
}

export interface AttachOptions {
  /** Scope a files attachment to this object key prefix. */
  prefix?: string
  /** Permission for a files attachment: 'read_only' or 'read_write'. */
  permission?: string
  /** Wiring intent: 'inject_creds', 'on_upload_trigger', or 'auto_embed'. */
  wiringIntent?: string
}

interface ListAppServicesResponse {
  appServices: AppService[]
}

interface ListAppDeploymentsResponse {
  deployments: AppDeployment[]
}

/**
 * Manages app services (hosted application containers) and their
 * auth-as-a-service configuration.
 */
export class AppServicesAPI {
  constructor(private readonly http: HTTPClient) {}

  // ---- CRUD ----

  /**
   * List all app services visible to the authenticated user.
   */
  async list(options?: AppServiceMethodOptions): Promise<AppService[]> {
    const raw = await this.http.get<unknown>('/app-services', undefined, options?.organizationId)
    const result = toCamel<ListAppServicesResponse>(raw)
    return result.appServices
  }

  /**
   * Get an app service by ID. Returns `null` when it does not exist (404).
   */
  async get(appServiceId: string, options?: AppServiceMethodOptions): Promise<AppService | null> {
    try {
      const raw = await this.http.get<unknown>(`/app-services/${appServiceId}`, undefined, options?.organizationId)
      return toCamel<AppService>(raw)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
        return null
      }
      throw err
    }
  }

  /**
   * Deploy a new app container and return its initial state. The service is
   * created in Pending status; poll `waitForRunning` until the container is
   * live and reachable over HTTPS.
   */
  async create(req: CreateAppServiceRequest): Promise<AppService> {
    const { organizationId, ...rest } = req
    const body = toSnake(rest)
    const raw = await this.http.post<unknown>('/app-services', body, organizationId)
    return toCamel<AppService>(raw)
  }

  /**
   * Apply a new container configuration. A changed image or environment
   * triggers a zero-downtime blue/green redeploy. Poll `waitForRunning`
   * until the app returns to running.
   */
  async update(appServiceId: string, req: UpdateAppServiceRequest, options?: AppServiceMethodOptions): Promise<AppService> {
    const body = toSnake(req)
    const raw = await this.http.patch<unknown>(`/app-services/${appServiceId}`, body, options?.organizationId)
    return toCamel<AppService>(raw)
  }

  /**
   * Delete an app service. A 404 response is treated as success (idempotent).
   */
  async delete(appServiceId: string, options?: AppServiceMethodOptions): Promise<void> {
    await this.http.delete(`/app-services/${appServiceId}`, options?.organizationId)
  }

  // ---- Attachments ----

  /**
   * Attach a managed service to a running app. The target may be a database
   * or another app (east-west app-to-app). The platform peers the private
   * networks, opens the target's port to the app's subnet, and rolls a
   * zero-downtime redeploy so the injected environment is updated: a database
   * injects connection credentials; an app injects
   * `MDB_<NAME>_HOST/PORT/URL` for plain-HTTP calls over the private SDN (no
   * credentials, no `DATABASE_URL`). An app supports up to five attachments
   * (databases and apps combined). The target must be Running, owned by the
   * same user, in the app's peering region, and not the app itself. Poll
   * `waitForRunning` until the app returns to running.
   *
   * Pass `opts` to scope a files attachment (prefix, permission,
   * wiringIntent); omit or pass `undefined` for a database or app attachment.
   */
  async attach(appServiceId: string, attachedServiceId: string, opts?: AttachOptions): Promise<AppService> {
    const body = toSnake({
      attachedServiceId,
      ...(opts?.prefix !== undefined ? { prefix: opts.prefix } : {}),
      ...(opts?.permission !== undefined ? { permission: opts.permission } : {}),
      ...(opts?.wiringIntent !== undefined ? { wiringIntent: opts.wiringIntent } : {}),
    })
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/attachments`, body)
    return toCamel<AppService>(raw)
  }

  /**
   * Remove an attachment from a running app. Poll `waitForRunning` until
   * the app returns to running.
   */
  async detach(appServiceId: string, attachmentId: string): Promise<AppService> {
    const raw = await this.http.delete<unknown>(`/app-services/${appServiceId}/attachments/${attachmentId}`)
    return toCamel<AppService>(raw)
  }

  // ---- Deployments ----

  /**
   * List the deploy history of an app service, newest first.
   */
  async listDeployments(appServiceId: string): Promise<AppDeployment[]> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/deployments`)
    const result = toCamel<ListAppDeploymentsResponse>(raw)
    return result.deployments
  }

  /**
   * Redeploy an earlier deployment via a zero-downtime blue/green swap.
   * Poll `waitForRunning` until it returns to running.
   */
  async rollback(appServiceId: string, deploymentId: string): Promise<AppService> {
    const body = toSnake({ deploymentId })
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/rollback`, body)
    return toCamel<AppService>(raw)
  }

  /**
   * Scale the app to a different compute tier. Poll `waitForRunning`
   * until it returns to running.
   */
  async scale(appServiceId: string, planName: string): Promise<AppService> {
    const body = toSnake({ planName })
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/scale`, body)
    return toCamel<AppService>(raw)
  }

  /**
   * Restart the app's running container in place.
   */
  async restart(appServiceId: string): Promise<void> {
    await this.http.post<unknown>(`/app-services/${appServiceId}/restart`)
  }

  // ---- Auth-as-a-service ----

  /**
   * Enable end-user authentication for an app service, backed by one of its
   * attached PostgreSQL services. The platform provisions the identity schema
   * in the customer database and stands up the OIDC issuer. Returns the
   * resulting auth configuration with its initial signing key record.
   *
   * The SMTP credentials in the request are stored in the secret store and
   * never returned by any subsequent read. To offer social login, set
   * `req.idpProviders`; each provider's `clientSecret` is stored in the
   * secret store and never returned.
   */
  async enableAuth(appServiceId: string, req: AuthEnableRequest): Promise<AuthConfigurationWithKeys> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/auth/enable`, body)
    return toCamel<AuthConfigurationWithKeys>(raw)
  }

  /**
   * Return the auth configuration and signing key records for an app service.
   * Returns `null` when auth is not enabled (404).
   */
  async getAuth(appServiceId: string): Promise<AuthConfigurationWithKeys | null> {
    try {
      const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/auth`)
      return toCamel<AuthConfigurationWithKeys>(raw)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
        return null
      }
      throw err
    }
  }

  /**
   * Disable auth for an app service. The end-user identity data in the
   * customer's database is left untouched; only the platform-managed issuer
   * and enablement state are torn down.
   */
  async disableAuth(appServiceId: string): Promise<void> {
    await this.http.post<unknown>(`/app-services/${appServiceId}/auth/disable`)
  }

  /**
   * Rotate the JWT signing key and return the newly minted key record.
   * Rotation is dual-kid: the new key is published alongside the outgoing
   * one so tokens signed by the previous key keep validating until it retires.
   */
  async rotateAuthKey(appServiceId: string): Promise<AuthSigningKey> {
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/auth/rotate-key`)
    const result = toCamel<{ signingKey: AuthSigningKey }>(raw)
    return result.signingKey
  }

  /**
   * Revoke one end-user session by id. The revocation is dispatched
   * asynchronously to the backing database's primary VM. Returns the
   * dispatched task id.
   */
  async revokeAuthSession(appServiceId: string, sessionId: string): Promise<RevokeSessionResponse> {
    const raw = await this.http.post<unknown>(
      `/app-services/${appServiceId}/auth/sessions/${sessionId}/revoke`,
    )
    return toCamel<RevokeSessionResponse>(raw)
  }

  // ---- Utility ----

  /**
   * Poll the app service until it reaches "Running" status or the timeout
   * expires. Throws when the service enters a terminal failure state or when
   * the timeout is exceeded. Poll interval is 10 seconds.
   */
  async waitForRunning(appServiceId: string, timeoutMs: number = 600_000): Promise<AppService> {
    const deadline = Date.now() + timeoutMs
    while (true) {
      const app = await this.get(appServiceId)
      if (!app) {
        throw new Error(`foundrydb: app service ${appServiceId} not found while waiting for running status`)
      }
      const status = app.status.toLowerCase()
      if (status === 'running') {
        return app
      }
      if (status.includes('failed') || status === 'error') {
        throw new Error(`foundrydb: app service ${appServiceId} entered terminal status "${app.status}"`)
      }
      if (Date.now() > deadline) {
        throw new Error(
          `foundrydb: timed out waiting for app service ${appServiceId} to reach running status (current: ${app.status})`,
        )
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 10_000))
    }
  }
}
