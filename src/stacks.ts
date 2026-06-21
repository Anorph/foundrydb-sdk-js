import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  StackTemplate,
  StackCostPreview,
  Stack,
  LaunchStackRequest,
  PreviewStackRequest,
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
