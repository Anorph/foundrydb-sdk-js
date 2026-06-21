import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  StackTemplate,
  StackCostPreview,
  Stack,
  LaunchStackRequest,
  PreviewStackRequest,
  CustomStackTemplate,
  CustomTemplateRequest,
  StackUpgradePlan,
  StackMigration,
} from './types.js'

interface ListStackTemplatesResponse {
  templates: StackTemplate[]
}

interface ListStacksResponse {
  stacks: Stack[]
}

interface StackActionResponse {
  status: string
}

interface ListCustomTemplatesResponse {
  templates: CustomStackTemplate[]
}

/**
 * Manages vertical starter stacks: pre-composed multi-resource bundles that
 * provision a complete application environment (database, object storage,
 * inference, app container) from a named template in a single operation.
 */
export class StacksAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all available stack templates. Each entry describes the template name,
   * display name, description, current version, and an optional cost preview
   * for the default configuration.
   */
  async listStackTemplates(): Promise<StackTemplate[]> {
    const raw = await this.http.get<unknown>('/stacks/templates')
    const result = toCamel<ListStackTemplatesResponse>(raw)
    return result.templates
  }

  /**
   * Preview the estimated monthly cost for a named stack template before
   * launching it. Returns a line-item cost breakdown, the total, and any
   * billing warnings (e.g. cost-ceiling enforcement).
   */
  async previewStack(req: PreviewStackRequest): Promise<StackCostPreview> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/stacks/preview', body)
    return toCamel<StackCostPreview>(raw)
  }

  /**
   * Launch a new stack from a template. The caller must supply
   * `acceptedMonthlyCost` (from a prior `previewStack` call) to confirm they
   * have reviewed the estimated spend. The stack is created in Pending status
   * and the platform provisions its resources asynchronously. Poll
   * `waitForRunning` until the stack reaches Running.
   */
  async launchStack(req: LaunchStackRequest): Promise<Stack> {
    const { organizationId, ...rest } = req
    const body = toSnake(rest)
    const raw = await this.http.post<unknown>('/stacks', body, organizationId)
    return toCamel<Stack>(raw)
  }

  /**
   * List all stacks visible to the authenticated user.
   */
  async listStacks(): Promise<Stack[]> {
    const raw = await this.http.get<unknown>('/stacks')
    const result = toCamel<ListStacksResponse>(raw)
    return result.stacks
  }

  /**
   * Get a stack by ID. Returns `null` when it does not exist (404).
   */
  async getStack(stackId: string): Promise<Stack | null> {
    try {
      const raw = await this.http.get<unknown>(`/stacks/${stackId}`)
      return toCamel<Stack>(raw)
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
   * Delete a stack. All constituent resources are deleted atomically via a
   * rollback sequence. Returns 202 Accepted; the stack transitions to Deleting
   * and then Deleted once all resources have been torn down.
   */
  async deleteStack(stackId: string): Promise<string> {
    const raw = await this.http.delete<unknown>(`/stacks/${stackId}`)
    const result = toCamel<StackActionResponse>(raw)
    return result.status
  }

  /**
   * Retry a stack that is stuck in Failed status. The platform re-runs the
   * provisioning sequence from the first incomplete resource. Returns 202
   * Accepted; poll `waitForRunning` until the stack reaches Running.
   */
  async retryStack(stackId: string): Promise<string> {
    const raw = await this.http.post<unknown>(`/stacks/${stackId}/retry`)
    const result = toCamel<StackActionResponse>(raw)
    return result.status
  }

  // ---- Marketplace: custom templates ----

  /**
   * Create a new custom stack template owned by the authenticated user's
   * organization. The template starts in the "draft" publication state and
   * "private" visibility unless overridden in the request.
   */
  async createTemplate(req: CustomTemplateRequest): Promise<CustomStackTemplate> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>('/stacks/templates', body)
    return toCamel<CustomStackTemplate>(raw)
  }

  /**
   * List all custom stack templates owned by the authenticated user's
   * organization.
   */
  async listMyTemplates(): Promise<CustomStackTemplate[]> {
    const raw = await this.http.get<unknown>('/stacks/templates/mine')
    const result = toCamel<ListCustomTemplatesResponse>(raw)
    return result.templates
  }

  /**
   * List all custom stack templates that have been published to the
   * marketplace (publication_status = "published", visibility = "public").
   */
  async listMarketplace(): Promise<CustomStackTemplate[]> {
    const raw = await this.http.get<unknown>('/stacks/templates/marketplace')
    const result = toCamel<ListCustomTemplatesResponse>(raw)
    return result.templates
  }

  /**
   * Get a single custom stack template by ID. Returns `null` when the
   * template does not exist or the caller has no access to it (404).
   */
  async getTemplate(id: string): Promise<CustomStackTemplate | null> {
    try {
      const raw = await this.http.get<unknown>(`/stacks/templates/${id}`)
      return toCamel<CustomStackTemplate>(raw)
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
   * Update one or more fields of a custom stack template. Only the fields
   * present in `req` are changed; omitted fields keep their current values.
   */
  async updateTemplate(
    id: string,
    req: Partial<CustomTemplateRequest>,
  ): Promise<CustomStackTemplate> {
    const body = toSnake(req)
    const raw = await this.http.patch<unknown>(`/stacks/templates/${id}`, body)
    return toCamel<CustomStackTemplate>(raw)
  }

  /**
   * Delete a custom stack template. The template must be in a non-published
   * state before it can be deleted.
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.http.delete<unknown>(`/stacks/templates/${id}`)
  }

  /**
   * Submit a custom stack template for marketplace review. The template
   * transitions from "draft" to "submitted" and is queued for approval.
   * Once approved it moves to "published" and appears in `listMarketplace`.
   */
  async publishTemplate(id: string): Promise<CustomStackTemplate> {
    const raw = await this.http.post<unknown>(`/stacks/templates/${id}/publish`)
    return toCamel<CustomStackTemplate>(raw)
  }

  /**
   * Remove a published custom stack template from the marketplace. The
   * template transitions to "unpublished" and is no longer discoverable via
   * `listMarketplace`. Existing stacks launched from the template are not
   * affected.
   */
  async unpublishTemplate(id: string): Promise<CustomStackTemplate> {
    const raw = await this.http.post<unknown>(`/stacks/templates/${id}/unpublish`)
    return toCamel<CustomStackTemplate>(raw)
  }

  // ---- Stack upgrade ----

  /**
   * Preview the resource changes and cost impact of upgrading a running stack
   * to the next available template version. No mutation is performed; call
   * `upgrade` to execute the plan.
   */
  async previewUpgrade(stackId: string): Promise<StackUpgradePlan> {
    const raw = await this.http.post<unknown>(`/stacks/${stackId}/upgrade/preview`)
    return toCamel<StackUpgradePlan>(raw)
  }

  /**
   * Execute a stack upgrade to the next available template version.
   * `acceptedMonthlyCost` must match the `totalCostEurMonthly` returned by
   * `previewUpgrade`; the platform rejects the request if the live cost
   * exceeds this value.
   */
  async upgrade(stackId: string, acceptedMonthlyCost: number): Promise<StackMigration> {
    const body = toSnake({ acceptedMonthlyCost })
    const raw = await this.http.post<unknown>(`/stacks/${stackId}/upgrade`, body)
    return toCamel<StackMigration>(raw)
  }

  // ---- Utility ----

  /**
   * Poll the stack until it reaches "Running" status or the timeout expires.
   * Throws when the stack enters a terminal failure state (Failed or Deleted)
   * or when the timeout is exceeded. Poll interval is 10 seconds.
   */
  async waitForRunning(stackId: string, timeoutMs = 600_000): Promise<Stack> {
    const deadline = Date.now() + timeoutMs
    while (true) {
      const stack = await this.getStack(stackId)
      if (!stack) {
        throw new Error(
          `foundrydb: stack ${stackId} not found while waiting for running status`,
        )
      }
      const status = stack.status.toLowerCase()
      if (status === 'running') {
        return stack
      }
      if (status === 'failed' || status === 'deleted') {
        throw new Error(
          `foundrydb: stack ${stackId} entered terminal status "${stack.status}"`,
        )
      }
      if (Date.now() > deadline) {
        throw new Error(
          `foundrydb: timed out waiting for stack ${stackId} to reach running status (current: ${stack.status})`,
        )
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 10_000))
    }
  }
}
