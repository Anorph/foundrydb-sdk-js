import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  InferenceProviderConfig,
  UpsertInferenceProviderRequest,
  InferenceKey,
  CreateInferenceKeyRequest,
  CreateInferenceKeyResult,
  OrgInferenceSettings,
  UpdateOrgInferenceSettingsRequest,
  InferenceUsageSummary,
  InferenceUsageOptions,
  InferenceChainOverride,
  InferenceProviderChainInfo,
  SetInferenceProviderChainRequest,
} from './types.js'

interface ListInferenceProvidersResponse {
  providers: InferenceProviderConfig[]
}

interface ListInferenceKeysResponse {
  keys: InferenceKey[]
}

/**
 * Manages the inference proxy for an organization: provider API keys, scoped
 * data-plane keys, org-wide policy, and aggregated usage reporting.
 *
 * Organizations bring their own provider API keys; the data plane is
 * OpenAI-compatible and lives at `/inference/v1/*`, authenticated with keys
 * minted through this surface. That data plane is outside this SDK.
 */
export class InferenceAPI {
  constructor(private readonly http: HTTPClient) {}

  // ---- Providers ----

  /**
   * List the organization's configured AI providers.
   */
  async listProviders(orgId: string): Promise<InferenceProviderConfig[]> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/inference/providers`,
      undefined,
      orgId,
    )
    const result = toCamel<ListInferenceProvidersResponse>(raw)
    return result.providers
  }

  /**
   * Create or replace the organization's config for one provider. `apiKey` is
   * required on first configuration; on update an empty `apiKey` keeps the
   * stored one. `provider` is one of `openai`, `anthropic`, `mistral`, or
   * `azure_openai`; `azure_openai` requires `baseUrl` (the Azure resource
   * endpoint).
   */
  async upsertProvider(
    orgId: string,
    req: UpsertInferenceProviderRequest,
  ): Promise<InferenceProviderConfig> {
    const body = toSnake(req)
    const raw = await this.http.put<unknown>(
      `/organizations/${orgId}/inference/providers`,
      body,
      orgId,
    )
    return toCamel<InferenceProviderConfig>(raw)
  }

  /**
   * Remove the organization's config for one provider. Subsequent proxy calls
   * routed to that provider fail until it is configured again.
   */
  async deleteProvider(orgId: string, provider: string): Promise<void> {
    await this.http.delete(
      `/organizations/${orgId}/inference/providers/${encodeURIComponent(provider)}`,
      orgId,
    )
  }

  // ---- Data-plane keys ----

  /**
   * List the organization's data-plane keys (prefixes and usage counters
   * only; secrets are never returned).
   */
  async listKeys(orgId: string): Promise<InferenceKey[]> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/inference/keys`,
      undefined,
      orgId,
    )
    const result = toCamel<ListInferenceKeysResponse>(raw)
    return result.keys
  }

  /**
   * Mint a new data-plane key. The returned `secret` is shown exactly once;
   * store it immediately, it cannot be retrieved again. Set `req.serviceId` to
   * scope the key to one inference service the organization owns. The key does
   * not take effect at the inference endpoint the instant it is minted: read
   * `activationNote` on the result before calling with it.
   */
  async createKey(
    orgId: string,
    req: CreateInferenceKeyRequest,
  ): Promise<CreateInferenceKeyResult> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/organizations/${orgId}/inference/keys`,
      body,
      orgId,
    )
    return toCamel<CreateInferenceKeyResult>(raw)
  }

  /**
   * Revoke a data-plane key immediately and irreversibly. The key row is kept
   * so past usage events stay attributable.
   */
  async revokeKey(orgId: string, keyId: string): Promise<void> {
    await this.http.delete(`/organizations/${orgId}/inference/keys/${keyId}`, orgId)
  }

  // ---- Settings ----

  /**
   * Get the organization's proxy policy settings. Returns `null` when the
   * settings have not been configured yet (404).
   */
  async getSettings(orgId: string): Promise<OrgInferenceSettings | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/organizations/${orgId}/inference/settings`,
        undefined,
        orgId,
      )
      return toCamel<OrgInferenceSettings>(raw)
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
   * Update the organization's proxy policy settings, creating them when
   * `monthlyCostLimitCents` is provided for the first time.
   */
  async updateSettings(
    orgId: string,
    req: UpdateOrgInferenceSettingsRequest,
  ): Promise<OrgInferenceSettings> {
    const body = toSnake(req)
    const raw = await this.http.put<unknown>(
      `/organizations/${orgId}/inference/settings`,
      body,
      orgId,
    )
    return toCamel<OrgInferenceSettings>(raw)
  }

  // ---- Provider chain ----

  /**
   * Get the organization's ordered provider chain, its EU-residency verdict, and
   * the per-surface overrides. Platform AI surfaces resolve their upstream
   * through this chain unless a surface override replaces it.
   */
  async getProviderChain(orgId: string): Promise<InferenceProviderChainInfo> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/inference/chain`,
      undefined,
      orgId,
    )
    return toCamel<InferenceProviderChainInfo>(raw)
  }

  /**
   * Replace the organization's ordered provider chain wholesale. Each entry is a
   * provider identifier (`openai`, `anthropic`, `mistral`, `azure_openai`,
   * `groq`, `foundrydb_managed`); the literal terminator `none` may close the
   * chain to state that resolution stops there with no implicit platform
   * fallback. Entries must be unique and the terminator must be the final entry.
   * Per-surface overrides are untouched and echoed back in the returned
   * configuration.
   */
  async setProviderChain(
    orgId: string,
    chain: string[],
  ): Promise<InferenceProviderChainInfo> {
    const req: SetInferenceProviderChainRequest = { providerChain: chain }
    const body = toSnake(req)
    const raw = await this.http.put<unknown>(
      `/organizations/${orgId}/inference/chain`,
      body,
      orgId,
    )
    return toCamel<InferenceProviderChainInfo>(raw)
  }

  /**
   * Replace the provider chain for one platform AI surface (`chat`, `advisor`,
   * `embedding`, `agent`, `explainer`). While the override exists, that surface
   * resolves through it instead of the org-level chain.
   */
  async setSurfaceOverride(
    orgId: string,
    surface: string,
    chain: string[],
  ): Promise<InferenceChainOverride> {
    const req: SetInferenceProviderChainRequest = { providerChain: chain }
    const body = toSnake(req)
    const raw = await this.http.put<unknown>(
      `/organizations/${orgId}/inference/chain/overrides/${encodeURIComponent(surface)}`,
      body,
      orgId,
    )
    return toCamel<InferenceChainOverride>(raw)
  }

  /**
   * Remove one surface's provider chain override so the org-level chain applies
   * to it again. Deleting an absent override succeeds, so the call is idempotent.
   */
  async deleteSurfaceOverride(orgId: string, surface: string): Promise<void> {
    await this.http.delete(
      `/organizations/${orgId}/inference/chain/overrides/${encodeURIComponent(surface)}`,
      orgId,
    )
  }

  // ---- Usage ----

  /**
   * Get aggregated inference usage for the organization. `opts.from` and
   * `opts.to` are RFC 3339 timestamps; `opts.groupBy` is `'model'` or
   * `'key'`. Empty opts fall back to the API defaults (current month, grouped
   * by model). The result carries `freeTier`, the organization's monthly free
   * token allowance standing, which always describes the current calendar month
   * regardless of the queried window.
   */
  async getUsage(orgId: string, opts: InferenceUsageOptions = {}): Promise<InferenceUsageSummary> {
    const query: Record<string, string | number | undefined> = {}
    if (opts.from) query['from'] = opts.from
    if (opts.to) query['to'] = opts.to
    if (opts.groupBy) query['group_by'] = opts.groupBy
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/inference/usage`,
      query,
      orgId,
    )
    return toCamel<InferenceUsageSummary>(raw)
  }
}
