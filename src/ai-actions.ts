import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  AIActionsResponse,
  AIActionsListOptions,
  CopilotPlanRequest,
  CopilotPlan,
  ExecuteAIActionRequest,
  ExecuteAIActionResult,
  AIActionExecutionListResponse,
  AIActionExecutionsListOptions,
  AIActionRollbackResult,
} from './types.js'

/**
 * Manages the AI actions surface: a prioritized feed of platform
 * recommendations, a copilot that turns natural-language intent into a
 * previewable plan, and a gated executor that delegates chosen actions to
 * their existing brokered handlers.
 *
 * Safety tiers (`read_only`, `confirm`, `typed_confirm`) are enforced
 * server-side. In v1 the executor accepts `confirm`-tier actions only;
 * destructive (`typed_confirm`) actions are not executable through this
 * surface.
 */
export class AIActionsAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Return the prioritized AI actions feed across the caller's services.
   * Read-only; requires the `services:read` scope.
   */
  async list(opts: AIActionsListOptions = {}): Promise<AIActionsResponse> {
    const query: Record<string, string | number | undefined> = {}
    if (opts.serviceId) query['service_id'] = opts.serviceId
    if (opts.kind) query['kind'] = opts.kind
    if (opts.severity) query['severity'] = opts.severity
    if (opts.limit !== undefined && opts.limit > 0) query['limit'] = opts.limit
    const raw = await this.http.get<unknown>('/ai/actions', query)
    return toCamel<AIActionsResponse>(raw)
  }

  /**
   * Turn a natural-language intent into a previewable plan. Executes nothing.
   * Requires the `services:read` scope. Returns 501 from the server when no
   * model provider is configured for the organization.
   */
  async copilotPlan(req: CopilotPlanRequest): Promise<CopilotPlan> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/ai/copilot/plan', body)
    return toCamel<CopilotPlan>(raw)
  }

  /**
   * Execute one `confirm`-tier action by delegating to its brokered, audited
   * handler. Requires the `services:write` scope. `confirm` must be `true`;
   * unknown or destructive action types are rejected by the server.
   *
   * Supported action types:
   * - `apply_index_recommendation`: `args.recommendation_id`
   * - `dismiss_advisory`: `args.advisory_match_id`, `args.reason` (non-empty)
   * - `scale_service`: `args.target_plan_name` or `args.cpu_cores` and
   *   `args.memory_mb`; optional `args.storage_mb`
   * - `add_replica`: `args.node_name`, `args.zone`; optional `args.cpu_cores`,
   *   `args.memory_mb`, `args.storage_mb`
   *
   * Inspect `status` and `httpStatus` on the result for the inner handler's
   * real outcome; the executor's own HTTP status being 200 only confirms the
   * gate accepted the request.
   */
  async execute(req: ExecuteAIActionRequest): Promise<ExecuteAIActionResult> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/ai/actions/execute', body)
    return toCamel<ExecuteAIActionResult>(raw)
  }

  /**
   * Return the outcome-loop execution history visible to the caller, newest
   * first. Read-only; requires the `services:read` scope.
   */
  async listExecutions(opts: AIActionExecutionsListOptions = {}): Promise<AIActionExecutionListResponse> {
    const query: Record<string, string | number | undefined> = {}
    if (opts.serviceId) query['service_id'] = opts.serviceId
    if (opts.limit !== undefined && opts.limit > 0) query['limit'] = opts.limit
    const raw = await this.http.get<unknown>('/ai/actions/executions', query)
    return toCamel<AIActionExecutionListResponse>(raw)
  }

  /**
   * Reverse a reversible execution by ID. Requires the `services:write`
   * scope. `apply_index_recommendation` drops the created index
   * (`revert_status: requested`); `dismiss_advisory` reactivates the advisory
   * (`revert_status: done`). `scale_service` and `add_replica` are not
   * reversible (server returns 422). Returns 404 when the execution is not
   * found or its service is not visible to the caller.
   */
  async rollbackExecution(executionId: string): Promise<AIActionRollbackResult> {
    const raw = await this.http.post<unknown>(
      `/ai/actions/executions/${encodeURIComponent(executionId)}/rollback`,
    )
    return toCamel<AIActionRollbackResult>(raw)
  }
}
