import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  EmbeddingPipeline,
  CreateEmbeddingPipelineRequest,
  UpdateEmbeddingPipelineRequest,
  EmbeddingPipelineRun,
} from './types.js'

interface ListEmbeddingPipelinesResponse {
  pipelines: EmbeddingPipeline[]
}

interface ListEmbeddingPipelineRunsResponse {
  runs: EmbeddingPipelineRun[]
}

/**
 * Manages embedding pipelines on PostgreSQL services with pgvector.
 *
 * A pipeline watches a source table, embeds the configured text columns
 * through the customer's own provider key, and writes vectors into an indexed
 * companion table. Continuous pipelines process rows as they change; scheduled
 * and manual pipelines process in discrete runs.
 */
export class EmbeddingPipelinesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * List all embedding pipelines on the service.
   */
  async list(serviceId: string): Promise<EmbeddingPipeline[]> {
    const raw = await this.http.get<unknown>(
      `/managed-services/${serviceId}/embedding-pipelines`,
    )
    const result = toCamel<ListEmbeddingPipelinesResponse>(raw)
    return result.pipelines
  }

  /**
   * Create an embedding pipeline on a PostgreSQL service with pgvector. Setup
   * is asynchronous: the returned pipeline starts in the configuring status;
   * poll `get` until it is active. The `providerApiKey` in the request is
   * write-only and is never returned.
   */
  async create(
    serviceId: string,
    req: CreateEmbeddingPipelineRequest,
  ): Promise<EmbeddingPipeline> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/managed-services/${serviceId}/embedding-pipelines`,
      body,
    )
    return toCamel<EmbeddingPipeline>(raw)
  }

  /**
   * Get one embedding pipeline. Returns `null` when it does not exist (404).
   */
  async get(serviceId: string, pipelineId: string): Promise<EmbeddingPipeline | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}`,
      )
      return toCamel<EmbeddingPipeline>(raw)
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
   * Update the set fields of an embedding pipeline. `providerApiKey` is
   * write-only.
   */
  async update(
    serviceId: string,
    pipelineId: string,
    req: UpdateEmbeddingPipelineRequest,
  ): Promise<EmbeddingPipeline> {
    const body = toSnake(req)
    const raw = await this.http.patch<unknown>(
      `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}`,
      body,
    )
    return toCamel<EmbeddingPipeline>(raw)
  }

  /**
   * Delete an embedding pipeline. When `removeData` is `true` the companion
   * vector table is dropped as well; otherwise the embedded vectors are left
   * in place.
   */
  async delete(serviceId: string, pipelineId: string, removeData = false): Promise<void> {
    const path =
      `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}` +
      (removeData ? '?remove_data=true' : '')
    await this.http.delete(path)
  }

  /**
   * Pause an active embedding pipeline.
   */
  async pause(serviceId: string, pipelineId: string): Promise<void> {
    await this.http.post(
      `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}/pause`,
    )
  }

  /**
   * Resume a paused embedding pipeline.
   */
  async resume(serviceId: string, pipelineId: string): Promise<void> {
    await this.http.post(
      `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}/resume`,
    )
  }

  /**
   * Enqueue one manual run for a scheduled or manual pipeline. The run is
   * accepted asynchronously in the queued status; poll `getRun` until it
   * finishes. Continuous pipelines have no discrete runs and reject this call.
   */
  async triggerRun(serviceId: string, pipelineId: string): Promise<EmbeddingPipelineRun> {
    const raw = await this.http.post<unknown>(
      `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}/runs`,
    )
    return toCamel<EmbeddingPipelineRun>(raw)
  }

  /**
   * List the latest runs of a pipeline, newest first.
   */
  async listRuns(serviceId: string, pipelineId: string): Promise<EmbeddingPipelineRun[]> {
    const raw = await this.http.get<unknown>(
      `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}/runs`,
    )
    const result = toCamel<ListEmbeddingPipelineRunsResponse>(raw)
    return result.runs
  }

  /**
   * Get one run of a pipeline. Returns `null` when it does not exist (404).
   */
  async getRun(
    serviceId: string,
    pipelineId: string,
    runId: string,
  ): Promise<EmbeddingPipelineRun | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/managed-services/${serviceId}/embedding-pipelines/${pipelineId}/runs/${runId}`,
      )
      return toCamel<EmbeddingPipelineRun>(raw)
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
}
