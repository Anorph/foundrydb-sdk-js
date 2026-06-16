import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type { VectorSearchRequest, VectorSearchResponse } from './types.js'

/**
 * Runs read-only pgvector similarity searches against managed PostgreSQL
 * services. The controller composes the SQL from validated inputs; results are
 * row-capped. Searches return synchronously.
 */
export class VectorSearchAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Run a read-only pgvector similarity search against a managed PostgreSQL
   * service. Set exactly one of `vector` (pre-computed) or `queryText`
   * (requires `pipelineId` so the platform can embed the text with the same
   * model that produced the indexed vectors).
   */
  async search(serviceId: string, req: VectorSearchRequest): Promise<VectorSearchResponse> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(
      `/managed-services/${serviceId}/vector-search`,
      body,
    )
    return toCamel<VectorSearchResponse>(raw)
  }
}
