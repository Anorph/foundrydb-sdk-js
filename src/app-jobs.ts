import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  AppJob,
  AppJobInvocation,
  AppJobInvocationLogs,
  AppJobCreateRequest,
  AppJobPatchRequest,
} from './types.js'

interface ListAppJobsResponse {
  jobs: AppJob[]
}

interface ListAppJobInvocationsResponse {
  invocations: AppJobInvocation[]
}

interface AppJobRunResponse {
  id?: string
  invocationId?: string
  jobId?: string
  serviceId?: string
  status?: string
  [key: string]: unknown
}

interface AppJobLogsTaskResponse {
  taskId: string
}

/**
 * Manages app job definitions and their invocation history on an app service.
 *
 * An app job is a container run (image, command, and environment layered over
 * the app's own configuration) with an optional cron schedule. A job without
 * a schedule only runs when triggered manually via `run`.
 *
 * All methods are scoped to one app service identified by `appServiceId`.
 */
export class AppJobsAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Create a new job definition on an app service. A service supports up to
   * 20 jobs; creating a second job with the same name returns a conflict.
   */
  async create(appServiceId: string, req: AppJobCreateRequest): Promise<AppJob> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/app-services/${appServiceId}/jobs`, body)
    return toCamel<AppJob>(raw)
  }

  /**
   * List the job definitions of an app service, oldest first.
   */
  async list(appServiceId: string): Promise<AppJob[]> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/jobs`)
    const result = toCamel<ListAppJobsResponse>(raw)
    return result.jobs
  }

  /**
   * Get one job definition. Returns `null` when it does not exist (404).
   */
  async get(appServiceId: string, jobId: string): Promise<AppJob | null> {
    try {
      const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/jobs/${jobId}`)
      return toCamel<AppJob>(raw)
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
   * Apply a partial update to a job definition. Editing the schedule,
   * timezone, or enabled flag recomputes the next fire time from now. Use
   * `clearSchedule: true` to remove the schedule; use `clearImageRef: true`
   * to revert to inheriting the app image.
   */
  async update(
    appServiceId: string,
    jobId: string,
    req: AppJobPatchRequest,
  ): Promise<AppJob> {
    const body = toSnake(req)
    const raw = await this.http.patch<unknown>(
      `/app-services/${appServiceId}/jobs/${jobId}`,
      body,
    )
    return toCamel<AppJob>(raw)
  }

  /**
   * Delete a job definition and its invocation history. A running invocation
   * finishes on the VM but reports into the deleted history. A missing job
   * (404) is treated as a successful no-op.
   */
  async delete(appServiceId: string, jobId: string): Promise<void> {
    await this.http.delete(`/app-services/${appServiceId}/jobs/${jobId}`)
  }

  /**
   * Trigger a manual invocation of a job and return the queued invocation
   * (202 Accepted). When the job is already at its concurrency cap the API
   * returns a conflict (409). Execution is asynchronous: poll `getInvocation`
   * until the status is terminal.
   */
  async run(appServiceId: string, jobId: string): Promise<AppJobInvocation> {
    const raw = await this.http.post<AppJobRunResponse>(
      `/app-services/${appServiceId}/jobs/${jobId}/run`,
    )
    const inv = toCamel<AppJobInvocation>(raw)
    // Handle the API fallback where only invocation_id is returned.
    if (!inv.id && (raw as { invocationId?: string }).invocationId) {
      inv.id = (raw as { invocationId?: string }).invocationId as string
      inv.jobId = jobId
    }
    return inv
  }

  /**
   * List a job's invocation history, newest first. `limit` caps the page
   * size (server default 50, max 200); `offset` skips that many rows. Pass 0
   * for either to use the server defaults.
   */
  async listInvocations(
    appServiceId: string,
    jobId: string,
    limit = 0,
    offset = 0,
  ): Promise<AppJobInvocation[]> {
    const query: Record<string, string | number | undefined> = {}
    if (limit > 0) query['limit'] = limit
    if (offset > 0) query['offset'] = offset
    const raw = await this.http.get<unknown>(
      `/app-services/${appServiceId}/jobs/${jobId}/invocations`,
      query,
    )
    const result = toCamel<ListAppJobInvocationsResponse>(raw)
    return result.invocations
  }

  /**
   * Get one invocation. Returns `null` when it does not exist (404).
   */
  async getInvocation(
    appServiceId: string,
    jobId: string,
    invocationId: string,
  ): Promise<AppJobInvocation | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/app-services/${appServiceId}/jobs/${jobId}/invocations/${invocationId}`,
      )
      return toCamel<AppJobInvocation>(raw)
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
   * Request the agent to fetch the logs of one invocation and return the
   * task ID to poll with `getInvocationLogs` (202 Accepted). `lines` caps
   * the tail length (server default 200, max 1000); pass 0 for the default.
   * Invocations that never ran (skips) have no logs.
   */
  async requestInvocationLogs(
    appServiceId: string,
    jobId: string,
    invocationId: string,
    lines = 0,
  ): Promise<string> {
    const query: Record<string, string | number | undefined> = {}
    if (lines > 0) query['lines'] = lines
    const raw = await this.http.post<AppJobLogsTaskResponse>(
      `/app-services/${appServiceId}/jobs/${jobId}/invocations/${invocationId}/logs` +
        (lines > 0 ? `?lines=${lines}` : ''),
    )
    const result = toCamel<AppJobLogsTaskResponse>(raw)
    return result.taskId
  }

  /**
   * Poll an invocation logs fetch task created by `requestInvocationLogs`.
   * While the agent is still working the response status is non-terminal;
   * once COMPLETED `result` holds the log lines.
   */
  async getInvocationLogs(
    appServiceId: string,
    jobId: string,
    invocationId: string,
    taskId: string,
  ): Promise<AppJobInvocationLogs> {
    const raw = await this.http.get<unknown>(
      `/app-services/${appServiceId}/jobs/${jobId}/invocations/${invocationId}/logs`,
      { task_id: taskId },
    )
    return toCamel<AppJobInvocationLogs>(raw)
  }
}
