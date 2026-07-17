import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  InferenceModelAdapter,
  InferenceAdapterRegisterRequest,
} from './types.js'

interface RegisterInferenceAdapterResponse {
  adapter: InferenceModelAdapter
}

interface ListInferenceServiceAdaptersResponse {
  adapters: InferenceModelAdapter[]
}

interface PromoteInferenceAdapterResponse {
  adapter: InferenceModelAdapter
}

/** Options accepted by inference-service methods that support per-call org scoping. */
export interface InferenceServiceMethodOptions {
  /**
   * Override the client-level `organizationId` for this call only.
   * Sends `X-Active-Org-ID: {organizationId}` on the request.
   */
  organizationId?: string
}

/**
 * Manages the customer LoRA fine-tuned adapter registry for managed inference
 * services: an open-weight LLM served by vLLM on a dedicated GPU server.
 *
 * A managed inference service serves a base model; a LoRA adapter is a small
 * set of fine-tuned weights, trained on the organization's own data, that is
 * hot-loaded onto that base model's GPU. The flow is two-step: the fine-tuning
 * workflow uploads the adapter artifact to the organization's Files bucket and
 * calls {@link InferenceServicesAPI.registerAdapter | registerAdapter} to record
 * an `uploaded`, promotable version, then
 * {@link InferenceServicesAPI.promoteAdapter | promoteAdapter} downloads the
 * weights, verifies their hash, and hot-loads them into vLLM with no restart.
 * Once active, the service answers to the adapter as
 * `foundrydb_managed/<served_model_name>` on the OpenAI-compatible endpoint. An
 * adapter never leaves its owning organization's boundary.
 */
export class InferenceServicesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Register an uploaded LoRA fine-tuned adapter version in the serving
   * registry, making it promotable. Call it after uploading the adapter
   * artifact (`adapter_model.safetensors` and `adapter_config.json`) to the
   * organization's Files bucket; {@link InferenceServicesAPI.promoteAdapter}
   * later binds the version to a GPU and hot-loads it. The row is org-scoped
   * and unbound (its `inferenceServiceId` is null) until promote, and it enters
   * the registry with status `uploaded`.
   *
   * The owning organization is resolved from the caller's active organization,
   * or from `req.organizationId` when set and the caller is a member of it (a
   * platform admin may register on behalf of any organization); it is never
   * trusted from the artifact. Returns the registered adapter.
   */
  async registerAdapter(
    req: InferenceAdapterRegisterRequest,
  ): Promise<InferenceModelAdapter> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      '/inference-services/adapters',
      body,
      req.organizationId,
    )
    const result = toCamel<RegisterInferenceAdapterResponse>(raw)
    return result.adapter
  }

  /**
   * List the LoRA fine-tuned adapter versions relevant to the service, newest
   * first: the versions bound to it (the currently active version plus its
   * superseded history) together with the organization's uploaded,
   * not-yet-promoted versions trained on this service's base model, so a freshly
   * registered adapter can be promoted from here. An uploaded version carries
   * status `uploaded` with a null `inferenceServiceId` until it is promoted;
   * uploaded versions for another base model, organization, or service are not
   * listed. Returns an empty array when nothing is bound or promotable.
   */
  async listAdapters(
    serviceId: string,
    options?: InferenceServiceMethodOptions,
  ): Promise<InferenceModelAdapter[]> {
    const raw = await this.http.get<unknown>(
      `/inference-services/${serviceId}/adapters`,
      undefined,
      options?.organizationId,
    )
    const result = toCamel<ListInferenceServiceAdaptersResponse>(raw)
    return result.adapters
  }

  /**
   * Promote a LoRA fine-tuned adapter version onto the service's serving GPU:
   * the platform downloads the adapter weights from Files, verifies their hash,
   * and hot-loads them into vLLM with no restart. The promoted version becomes
   * `active` and any previously active version is marked `superseded`. Rollback
   * is achieved through this same method by promoting a prior (superseded)
   * version, so one call covers both directions. Requires manage-level
   * authority on the service; the request has no body. Returns the promoted
   * adapter after its transition to active.
   */
  async promoteAdapter(
    serviceId: string,
    adapterId: string,
    options?: InferenceServiceMethodOptions,
  ): Promise<InferenceModelAdapter> {
    const raw = await this.http.post<unknown>(
      `/inference-services/${serviceId}/adapters/${adapterId}/promote`,
      undefined,
      options?.organizationId,
    )
    const result = toCamel<PromoteInferenceAdapterResponse>(raw)
    return result.adapter
  }
}
