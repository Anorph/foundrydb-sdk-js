import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  DataPipeline,
  CreateDataPipelineRequest,
  DataPipelineStatus,
} from './types.js'

interface ListDataPipelinesResponse {
  pipelines: DataPipeline[]
}

/**
 * Manages data pipelines between managed services.
 *
 * Currently supports CDC from PostgreSQL to Kafka
 * (`pipeline_type: 'cdc_pg_to_kafka'`), streamed via a Debezium connector on
 * the sink's Kafka Connect addon. Provisioning is asynchronous.
 */
export class DataPipelinesAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Create a data pipeline between two services owned by the organization.
   * Provisioning is asynchronous: the returned pipeline is in the Pending
   * state. Poll `getStatus` until it reaches Running.
   */
  async create(orgId: string, req: CreateDataPipelineRequest): Promise<DataPipeline> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/organizations/${orgId}/pipelines`, body, orgId)
    return toCamel<DataPipeline>(raw)
  }

  /**
   * List all data pipelines owned by the organization.
   */
  async list(orgId: string): Promise<DataPipeline[]> {
    const raw = await this.http.get<unknown>(`/organizations/${orgId}/pipelines`, undefined, orgId)
    const result = toCamel<ListDataPipelinesResponse>(raw)
    return result.pipelines
  }

  /**
   * Get the data pipeline with the given ID. Returns `null` when it does not
   * exist (404).
   */
  async get(orgId: string, pipelineId: string): Promise<DataPipeline | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/organizations/${orgId}/pipelines/${pipelineId}`,
        undefined,
        orgId,
      )
      return toCamel<DataPipeline>(raw)
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
   * Schedule asynchronous teardown of the data pipeline.
   */
  async delete(orgId: string, pipelineId: string): Promise<void> {
    await this.http.delete(`/organizations/${orgId}/pipelines/${pipelineId}`, orgId)
  }

  /**
   * Get the latest reconciler-observed status of the pipeline, including
   * connector state, per-task states, and source lag. Returns `null` when the
   * pipeline does not exist (404).
   */
  async getStatus(pipelineId: string): Promise<DataPipelineStatus | null> {
    try {
      const raw = await this.http.get<unknown>(`/pipelines/${pipelineId}/status`)
      return toCamel<DataPipelineStatus>(raw)
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
