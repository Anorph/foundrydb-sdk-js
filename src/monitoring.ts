import type { HTTPClient } from './client.js'
import { toCamel } from './client.js'
import type { ServiceMetrics, LogsTaskResponse, LogsResultResponse } from './types.js'

/**
 * Monitoring and observability for services.
 */
export class MonitoringAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Get current metrics for a service.
   */
  async getMetrics(serviceId: string): Promise<ServiceMetrics> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}/metrics/current`)
    return toCamel<ServiceMetrics>(raw)
  }

  /**
   * Request log retrieval for a service (returns a task ID).
   * Poll {@link getLogs} with the returned task ID until status is "completed".
   */
  async requestLogs(serviceId: string, lines = 100): Promise<LogsTaskResponse> {
    const raw = await this.http.post<unknown>(`/managed-services/${serviceId}/logs?lines=${lines}`)
    return toCamel<LogsTaskResponse>(raw)
  }

  /**
   * Get log results for a previously requested log task.
   */
  async getLogs(serviceId: string, taskId: string): Promise<LogsResultResponse> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}/logs`, {
      task_id: taskId,
    })
    return toCamel<LogsResultResponse>(raw)
  }

  /**
   * Convenience method: request logs and poll until complete.
   * Waits up to `timeoutMs` milliseconds (default 60000) with `pollIntervalMs` (default 2000).
   */
  async fetchLogs(
    serviceId: string,
    options?: {
      lines?: number
      timeoutMs?: number
      pollIntervalMs?: number
    },
  ): Promise<string> {
    const lines = options?.lines ?? 100
    const timeoutMs = options?.timeoutMs ?? 60_000
    const pollIntervalMs = options?.pollIntervalMs ?? 2_000

    const { taskId } = await this.requestLogs(serviceId, lines)

    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const result = await this.getLogs(serviceId, taskId)
      if (result.status === 'completed') {
        return result.logs
      }
      await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    throw new Error(`Log retrieval timed out after ${timeoutMs}ms (task ${taskId})`)
  }
}
