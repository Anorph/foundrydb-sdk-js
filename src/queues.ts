import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  Queue,
  QueueCreateRequest,
  QueueEnqueueRequest,
  QueueEnqueueResult,
  QueueStatsResult,
} from './types.js'

interface ListQueuesResponse {
  queues: Queue[]
}

interface QueueTaskResponse {
  taskId: string
}

/**
 * Manages message queues hosted on a PostgreSQL managed service.
 *
 * Queue state (messages) lives in the customer's database, transactional
 * with their data. Brokered data-plane operations (enqueue, stats) require
 * the queue to be in Active status.
 */
export class QueuesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Create a queue on a PostgreSQL managed service. Provisioning is
   * asynchronous: the returned queue starts in the Provisioning status; poll
   * `get` until it reaches Active. A service supports up to 50 queues.
   */
  async create(serviceId: string, req: QueueCreateRequest): Promise<Queue> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/managed-services/${serviceId}/queues`, body)
    return toCamel<Queue>(raw)
  }

  /**
   * List the service's queues, each reconciled against its pending
   * provisioning task.
   */
  async list(serviceId: string): Promise<Queue[]> {
    const raw = await this.http.get<unknown>(`/managed-services/${serviceId}/queues`)
    const result = toCamel<ListQueuesResponse>(raw)
    return result.queues
  }

  /**
   * Get one queue by name, reconciled. Returns `null` when it does not
   * exist (404).
   */
  async get(serviceId: string, queueName: string): Promise<Queue | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/managed-services/${serviceId}/queues/${encodeURIComponent(queueName)}`,
      )
      return toCamel<Queue>(raw)
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
   * Schedule asynchronous removal of a queue (202 Accepted). The returned
   * queue is in the Deprovisioning status; it disappears from `list` once the
   * agent confirms the customer-side objects are gone. Pending messages are
   * destroyed with the queue. Returns `null` when the queue does not exist
   * (404, idempotent).
   */
  async delete(serviceId: string, queueName: string): Promise<Queue | null> {
    try {
      const raw = await this.http.delete<unknown>(
        `/managed-services/${serviceId}/queues/${encodeURIComponent(queueName)}`,
      )
      return toCamel<Queue>(raw)
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
   * Enqueue a batch of messages to an Active queue through a brokered agent
   * task (202 Accepted). Returns the task ID to poll with `getEnqueueResult`.
   * The batch lands in one transaction, all-or-nothing. A batch is limited to
   * 100 messages.
   */
  async enqueue(
    serviceId: string,
    queueName: string,
    req: QueueEnqueueRequest,
  ): Promise<string> {
    const body = toSnake(req)
    const raw = await this.http.post<QueueTaskResponse>(
      `/managed-services/${serviceId}/queues/${encodeURIComponent(queueName)}/messages`,
      body,
    )
    const result = toCamel<QueueTaskResponse>(raw)
    return result.taskId
  }

  /**
   * Poll an enqueue task created by `enqueue`. While the agent is still
   * working the response status is non-terminal; once COMPLETED `result`
   * holds the assigned message IDs.
   */
  async getEnqueueResult(
    serviceId: string,
    queueName: string,
    taskId: string,
  ): Promise<QueueEnqueueResult> {
    const raw = await this.http.get<unknown>(
      `/managed-services/${serviceId}/queues/${encodeURIComponent(queueName)}/messages`,
      { task_id: taskId },
    )
    return toCamel<QueueEnqueueResult>(raw)
  }

  /**
   * Request a depth snapshot of an Active queue through a brokered agent
   * task (202 Accepted). Returns the task ID to poll with `getStats`.
   */
  async requestStats(serviceId: string, queueName: string): Promise<string> {
    const raw = await this.http.post<QueueTaskResponse>(
      `/managed-services/${serviceId}/queues/${encodeURIComponent(queueName)}/stats`,
    )
    const result = toCamel<QueueTaskResponse>(raw)
    return result.taskId
  }

  /**
   * Poll a stats task created by `requestStats`. While the agent is still
   * working the response status is non-terminal; once COMPLETED `result`
   * holds the depth snapshot.
   */
  async getStats(
    serviceId: string,
    queueName: string,
    taskId: string,
  ): Promise<QueueStatsResult> {
    const raw = await this.http.get<unknown>(
      `/managed-services/${serviceId}/queues/${encodeURIComponent(queueName)}/stats`,
      { task_id: taskId },
    )
    return toCamel<QueueStatsResult>(raw)
  }
}
