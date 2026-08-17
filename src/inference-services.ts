import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  InferenceService,
  InferenceServiceRequest,
  ListInferenceServicesResponse,
  InferenceModelRate,
  ListInferenceModelRatesResponse,
  ServerlessInferenceModel,
  ListServerlessInferenceModelsResponse,
  InferenceModelSwitchRequest,
  InferenceFitCheckRequest,
  InferenceFitCheckResult,
  InferenceServiceUsage,
  InferenceServiceMetrics,
  InferenceModelAdapter,
  InferenceModelAdapterResponse,
  ListInferenceServiceAdaptersResponse,
  InferenceAdapterRegisterRequest,
} from './types.js'

function isNotFound(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'statusCode' in err &&
    (err as { statusCode: number }).statusCode === 404
  )
}

/**
 * Manages inference services: an open-weight LLM served by vLLM, exposing an
 * OpenAI-compatible endpoint on the service's own hostname. This is the service
 * management plane (create, list, get, delete an inference service); it is
 * distinct from the inference proxy management plane in `InferenceAPI`.
 *
 * There are two SKUs, selected by `inferenceSku` (or inferred from `planName`):
 *
 * - `serverless` multiplexes the service onto a platform-owned shared GPU pool.
 *   It takes no plan and rents no card, is limited to curated catalog models a
 *   pool is already serving, and is billed per token (and per image for the
 *   diffusion models) against the published rate card, with the organization's
 *   monthly free token allowance consumed first.
 * - `dedicated` rents a whole-card GPU server for the tenant. It takes a GPU
 *   plan, serves curated or Hugging Face models, supports LoRA adapters and
 *   keep-warm, and is billed per GPU-hour for as long as the card is allocated
 *   rather than per token.
 *
 * Either way the customer calls `endpointBaseUrl` with an `fdb-inf` key. On that
 * per-service hostname the model field is
 * `foundrydb_managed/<servedModelName>`; the unprefixed served model name is
 * also accepted there as a convenience for apps that hardcode it.
 */
export class InferenceServicesAPI {
  constructor(private readonly http: HTTPClient) {}

  // ---- Services ----

  /**
   * List the inference services visible to the authenticated user (the active
   * organization's, or the caller's own).
   */
  async list(): Promise<InferenceService[]> {
    const raw = await this.http.get<unknown>('/inference-services')
    const result = toCamel<ListInferenceServicesResponse>(raw)
    return result.inferenceServices
  }

  /**
   * Get the inference service with the given UUID. Returns `null` when it does
   * not exist (404).
   */
  async get(serviceId: string): Promise<InferenceService | null> {
    try {
      const raw = await this.http.get<unknown>(`/inference-services/${serviceId}`)
      return toCamel<InferenceService>(raw)
    } catch (err: unknown) {
      if (isNotFound(err)) return null
      throw err
    }
  }

  /**
   * Provision an inference service and return its initial state. The service is
   * created in the Pending status; poll {@link get} until it reaches Running and
   * `endpointBaseUrl` is set.
   *
   * A GPU `planName` creates a dedicated whole-card service, billed per
   * GPU-hour. Omitting `planName` (or setting `inferenceSku` to `serverless`)
   * binds the service to the platform shared pool, billed per token. Serverless
   * additionally requires a curated catalog model that a pool is already serving
   * (see {@link listServerlessModels}): an unserved model is refused with 503,
   * and a fleet whose pools are all at their binding ceiling with 409.
   *
   * A conditional curated model, and every Hugging Face model, requires
   * `req.inferenceConfig.licenseAccepted` to be true. The write-only `hfToken`
   * is accepted here and never returned.
   */
  async create(req: InferenceServiceRequest): Promise<InferenceService> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/inference-services', body)
    return toCamel<InferenceService>(raw)
  }

  /**
   * Provision a serverless inference service on the platform shared pool for one
   * curated catalog model, which is the whole of what a serverless create takes:
   * there is no plan, no zone, and no serving knobs, because the card is the
   * platform's and its serving shape is fixed.
   *
   * `modelId` must be a curated catalog id a pool is serving right now; take it
   * from {@link listServerlessModels} rather than guessing, since an unserved
   * model is refused. Set `licenseAccepted` for an accept-gated model. `orgId` is
   * optional and assigns the service to an organization the caller belongs to.
   *
   * It is a convenience over {@link create}: use that directly to reach the
   * dedicated SKU or any other field.
   */
  async createServerless(
    name: string,
    modelId: string,
    orgId?: string,
    licenseAccepted = false,
  ): Promise<InferenceService> {
    return this.create({
      name,
      inferenceSku: 'serverless',
      ...(orgId ? { organizationId: orgId } : {}),
      inferenceConfig: {
        modelId,
        modelSource: 'curated',
        licenseAccepted,
      },
    })
  }

  /**
   * Initiate deletion of the inference service. The platform tears down the vLLM
   * runtime, ingress, certificates, DNS, floating IP, and the GPU server. A 404
   * response is treated as success (idempotent).
   */
  async delete(serviceId: string): Promise<void> {
    try {
      await this.http.delete(`/inference-services/${serviceId}`)
    } catch (err: unknown) {
      if (isNotFound(err)) return
      throw err
    }
  }

  // ---- Catalog ----

  /**
   * List the price in force right now for every curated model that has one, so a
   * create flow can quote what a serverless service will cost before anyone
   * commits. It is the same resolution the metering path uses, so the quoted
   * price and the billed price cannot diverge.
   *
   * A model with no rate is omitted rather than reported at zero: zero would read
   * as "free", when the truth is that its price is not set yet. An empty array
   * means nothing is priced yet, never an error. The listing is a property of the
   * platform, not of the caller's organization.
   */
  async listModelRates(): Promise<InferenceModelRate[]> {
    const raw = await this.http.get<unknown>('/inference-services/model-rates')
    const result = toCamel<ListInferenceModelRatesResponse>(raw)
    return result.models
  }

  /**
   * List the curated models a serverless create can bind to right now: those a
   * platform pool is already serving. It is the question to ask before
   * {@link createServerless}, which refuses any other model.
   *
   * An empty array is the honest "serverless has nothing to offer yet" answer
   * rather than an error. The dedicated SKU is not constrained by this listing:
   * it rents its own card and can serve any curated or Hugging Face model that
   * fits.
   */
  async listServerlessModels(): Promise<ServerlessInferenceModel[]> {
    const raw = await this.http.get<unknown>('/inference-services/serverless-models')
    const result = toCamel<ListServerlessInferenceModelsResponse>(raw)
    return result.models
  }

  /**
   * Change which curated model an existing inference service serves, in place.
   * The service's model volume is replaced by a clone of the target model's
   * pre-baked volume template when the platform holds one for the service's zone
   * (minutes, no weight download), or by a fresh volume taking the ordinary
   * download path otherwise; the GPU server, GPU plan, endpoint hostname, TLS
   * certificate, firewall rules, inference keys, and billing identity are
   * unchanged, and the old volume is deleted only once the new model is in place.
   *
   * The service must be Running or Stopped and single-node, with no other
   * transition in flight and no active LoRA adapter bound to the current base
   * model (demote it first). Returns the service in the SwitchingModel status;
   * poll {@link get} until it returns to the state it came from (Running, or
   * Stopped for a service switched while stopped, whose next start serves the new
   * model).
   */
  async switchModel(
    serviceId: string,
    req: InferenceModelSwitchRequest,
  ): Promise<InferenceService> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/inference-services/${serviceId}/switch-model`,
      body,
    )
    return toCamel<InferenceService>(raw)
  }

  /**
   * Answer whether a model, at a context length, runs on a GPU plan, without
   * provisioning anything: nothing is created, nothing is billed, and no GPU is
   * touched.
   *
   * The fit model is `weights + kvCache(maxModelLen) + servingOverhead` within
   * the memory-utilization budget of the plan's VRAM. Weights follow from the
   * parameter count and the served dtype (a curated FP8 checkpoint counts half of
   * its BF16 equivalent), the KV cache grows linearly with the served context and
   * halves under an fp8 cache, and the overhead is a fixed allowance for the CUDA
   * context, activations, and the vLLM runtime. {@link create} and
   * {@link switchModel} enforce the same equation, so a false `fits` here is the
   * refusal those calls would return, and `suggestions` names the closest fix.
   *
   * A configuration that does not fit is still a successful call: the question
   * was answered. An error is thrown for an unknown model or plan (400), or when
   * a Hugging Face model's metadata could not be fetched so its size is unknown
   * (502); a curated model is sized from the catalog and never hits the latter.
   */
  async checkFit(req: InferenceFitCheckRequest): Promise<InferenceFitCheckResult> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/inference-services/fit-check', body)
    return toCamel<InferenceFitCheckResult>(raw)
  }

  // ---- Usage and metrics ----

  /**
   * Get the service's metered usage and cost as a time-bucketed series with
   * rolled-up totals, plus the month-to-date rollup. The optional `since` is a Go
   * duration (for example `'1h'`, `'24h'`) or an RFC 3339 start time; omitted
   * defaults to 24 hours and it is capped at 30 days. The effective window never
   * starts before the service was created. Returns `null` when the service does
   * not exist (404).
   *
   * Which figure is the charge depends on the SKU: `monthToDate.tokens` for a
   * serverless service (billed per token) and `monthToDate.gpuHour` for a
   * dedicated one (billed per allocated GPU-hour). The other is a usage signal,
   * not a bill.
   */
  async getUsage(serviceId: string, since?: string): Promise<InferenceServiceUsage | null> {
    const query: Record<string, string | number | undefined> = {}
    if (since) query['since'] = since
    try {
      const raw = await this.http.get<unknown>(
        `/inference-services/${serviceId}/usage`,
        query,
      )
      return toCamel<InferenceServiceUsage>(raw)
    } catch (err: unknown) {
      if (isNotFound(err)) return null
      throw err
    }
  }

  /**
   * Get the service's live vLLM and GPU serving telemetry as an ordered snapshot
   * series with the most recent snapshot broken out as `latest`. The optional
   * `since` is a Go duration (for example `'30m'`, `'1h'`) or an RFC 3339 start
   * time; omitted defaults to 30 minutes and the window is capped at 24 hours.
   * Returns `null` when the service does not exist (404).
   */
  async getMetrics(
    serviceId: string,
    since?: string,
  ): Promise<InferenceServiceMetrics | null> {
    const query: Record<string, string | number | undefined> = {}
    if (since) query['since'] = since
    try {
      const raw = await this.http.get<unknown>(
        `/inference-services/${serviceId}/metrics`,
        query,
      )
      return toCamel<InferenceServiceMetrics>(raw)
    } catch (err: unknown) {
      if (isNotFound(err)) return null
      throw err
    }
  }

  // ---- LoRA fine-tuned adapters ----

  /**
   * List the LoRA fine-tuned adapter versions relevant to the service, newest
   * first: the versions bound to it (the currently active version plus its
   * superseded history) together with the organization's uploaded,
   * not-yet-promoted versions trained on this service's base model, so a freshly
   * registered adapter can be promoted from here. An uploaded version carries
   * status `uploaded` until it is promoted; uploaded versions for another base
   * model, organization, or service are not listed. Returns an empty array when
   * nothing is bound or promotable, and `null` when the service does not exist
   * (404).
   */
  async listAdapters(serviceId: string): Promise<InferenceModelAdapter[] | null> {
    try {
      const raw = await this.http.get<unknown>(`/inference-services/${serviceId}/adapters`)
      const result = toCamel<ListInferenceServiceAdaptersResponse>(raw)
      return result.adapters
    } catch (err: unknown) {
      if (isNotFound(err)) return null
      throw err
    }
  }

  /**
   * Promote a LoRA fine-tuned adapter version onto the service's serving GPU: the
   * platform downloads the adapter weights from Files, verifies their hash, and
   * hot-loads them into vLLM with no restart. The promoted version becomes active
   * and any previously active version is marked superseded. Rollback is achieved
   * through this same method by promoting a prior (superseded) version. Requires
   * manage-level authority; the request has no body. Returns the promoted adapter
   * after its transition to active.
   */
  async promoteAdapter(serviceId: string, adapterId: string): Promise<InferenceModelAdapter> {
    const raw = await this.http.post<unknown>(
      `/inference-services/${serviceId}/adapters/${adapterId}/promote`,
    )
    const result = toCamel<InferenceModelAdapterResponse>(raw)
    return result.adapter
  }

  /**
   * Stop serving the active LoRA fine-tuned adapter version without promoting a
   * replacement: the registry row moves to superseded and the adapter is
   * hot-unloaded from the running vLLM, so the served name stops answering and
   * its adapter slot is freed. It is the inverse of {@link promoteAdapter} and
   * the only exit from active that does not require another version (an in-place
   * model switch is refused while an adapter is active, and an active version
   * cannot be deleted). Callers still addressing
   * `foundrydb_managed/<servedModelName>` receive errors afterwards; the service
   * keeps serving its base model and the version stays promotable. Requires
   * manage-level authority; the request has no body. Returns the adapter after
   * its transition to superseded.
   */
  async demoteAdapter(serviceId: string, adapterId: string): Promise<InferenceModelAdapter> {
    const raw = await this.http.post<unknown>(
      `/inference-services/${serviceId}/adapters/${adapterId}/demote`,
    )
    const result = toCamel<InferenceModelAdapterResponse>(raw)
    return result.adapter
  }

  /**
   * Record an uploaded LoRA fine-tuned adapter version in the serving registry,
   * making it promotable. Call it after uploading the adapter artifact
   * (`adapter_model.safetensors` and `adapter_config.json`) to the organization's
   * Files bucket; {@link promoteAdapter} later binds the version to a GPU and
   * hot-loads it. The row is org-scoped and unbound (its `inferenceServiceId` is
   * null) until promote, and it enters the registry with status `uploaded`.
   */
  async registerAdapter(
    req: InferenceAdapterRegisterRequest,
  ): Promise<InferenceModelAdapter> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/inference-services/adapters', body)
    const result = toCamel<InferenceModelAdapterResponse>(raw)
    return result.adapter
  }

  /**
   * Remove one LoRA fine-tuned adapter version from the organization's serving
   * registry. It is the lifecycle counterpart to {@link registerAdapter}: an
   * uploaded (never-promoted) or superseded (rolled-off) version can be removed
   * so the registry does not accumulate stale rows. An actively-served version is
   * refused (409): promote a different version or delete the inference service
   * first. Organization-scoped; a cross-org, unknown, or already-removed adapter
   * id throws not-found (a soft-deleted version is invisible to reads, so a
   * repeat delete is a 404).
   */
  async deleteAdapter(adapterId: string): Promise<void> {
    await this.http.delete(`/inference-services/adapters/${adapterId}`)
  }
}
