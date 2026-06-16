import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  WebhookEndpoint,
  WebhookDelivery,
  CreateWebhookRequest,
  ListEventsOptions,
  ListEventsResponse,
} from './types.js'

interface ListWebhooksResponse {
  webhooks: WebhookEndpoint[]
}

interface ListWebhookDeliveriesResponse {
  deliveries: WebhookDelivery[]
}

interface RotateSecretResponse {
  secret: string
}

/**
 * Manages webhook endpoints for an organization and the platform event feed.
 */
export class WebhooksAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Register a webhook endpoint for an organization. The returned endpoint
   * includes the signing secret exactly once; store it immediately.
   */
  async create(orgId: string, req: CreateWebhookRequest): Promise<WebhookEndpoint> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/organizations/${orgId}/webhooks`, body, orgId)
    return toCamel<WebhookEndpoint>(raw)
  }

  /**
   * List all webhook endpoints of an organization.
   */
  async list(orgId: string): Promise<WebhookEndpoint[]> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/webhooks`,
      undefined,
      orgId,
    )
    const result = toCamel<ListWebhooksResponse>(raw)
    return result.webhooks
  }

  /**
   * Get one webhook endpoint. Returns `null` when it does not exist (404).
   */
  async get(orgId: string, webhookId: string): Promise<WebhookEndpoint | null> {
    try {
      const raw = await this.http.get<unknown>(
        `/organizations/${orgId}/webhooks/${webhookId}`,
        undefined,
        orgId,
      )
      return toCamel<WebhookEndpoint>(raw)
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
   * Remove a webhook endpoint from an organization.
   */
  async delete(orgId: string, webhookId: string): Promise<void> {
    await this.http.delete(`/organizations/${orgId}/webhooks/${webhookId}`, orgId)
  }

  /**
   * Enqueue a test event delivery for a webhook endpoint, bypassing its
   * event-type filter.
   */
  async test(orgId: string, webhookId: string): Promise<void> {
    await this.http.post(
      `/organizations/${orgId}/webhooks/${webhookId}/test`,
      undefined,
      orgId,
    )
  }

  /**
   * List the most recent deliveries for a webhook endpoint.
   */
  async listDeliveries(orgId: string, webhookId: string): Promise<WebhookDelivery[]> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/webhooks/${webhookId}/deliveries`,
      undefined,
      orgId,
    )
    const result = toCamel<ListWebhookDeliveriesResponse>(raw)
    return result.deliveries
  }

  /**
   * Re-send the payload of a prior delivery as a fresh delivery and return
   * the new delivery record.
   */
  async replayDelivery(
    orgId: string,
    webhookId: string,
    deliveryId: string,
  ): Promise<WebhookDelivery> {
    const raw = await this.http.post<unknown>(
      `/organizations/${orgId}/webhooks/${webhookId}/deliveries/${deliveryId}/replay`,
      undefined,
      orgId,
    )
    return toCamel<WebhookDelivery>(raw)
  }

  /**
   * Replace the signing secret of a webhook endpoint and return the new
   * secret. The previous secret stops being used immediately.
   */
  async rotateSecret(orgId: string, webhookId: string): Promise<string> {
    const raw = await this.http.post<RotateSecretResponse>(
      `/organizations/${orgId}/webhooks/${webhookId}/rotate-secret`,
      undefined,
      orgId,
    )
    const result = toCamel<RotateSecretResponse>(raw)
    return result.secret
  }

  /**
   * Re-enable a webhook endpoint that was disabled manually or auto-disabled
   * after persistent delivery failures, clearing its failure streak.
   */
  async enable(orgId: string, webhookId: string): Promise<void> {
    await this.http.post(
      `/organizations/${orgId}/webhooks/${webhookId}/enable`,
      undefined,
      orgId,
    )
  }

  // ---- Event feed ----

  /**
   * Return one page of the cursor-paginated event feed visible to the
   * authenticated user (own events plus organization memberships).
   * Pass `opts.cursor` from a previous page's `nextCursor` to continue.
   */
  async listEvents(opts: ListEventsOptions = {}): Promise<ListEventsResponse> {
    const query: Record<string, string | number | undefined> = {}
    if (opts.cursor !== undefined && opts.cursor > 0) query['cursor'] = opts.cursor
    if (opts.limit !== undefined && opts.limit > 0) query['limit'] = opts.limit
    if (opts.eventType) query['event_type'] = opts.eventType
    const raw = await this.http.get<unknown>('/events', query)
    return toCamel<ListEventsResponse>(raw)
  }
}
