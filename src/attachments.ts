import type { HTTPClient } from './client.js'
import { toCamel, toSnake } from './client.js'
import type {
  AppService,
  AttachmentCatalogEntry,
  AttachmentSummary,
  AttachmentCredentials,
  CreateAttachmentRequest,
} from './types.js'

interface ListAttachmentCatalogResponse {
  catalog: AttachmentCatalogEntry[]
}

interface ListAttachmentsResponse {
  attachments: AttachmentSummary[]
}

/**
 * Manages companion-app attachments: click-to-attach applications (Metabase,
 * Directus, Hasura, NocoDB, Open WebUI, etc.) that the platform provisions and
 * wires to a parent managed database service automatically.
 *
 * Workflow:
 * 1. Call `getCatalog()` to list available companion app kinds.
 * 2. Call `create(parentServiceId, { kind })` to provision and attach one.
 *    The returned `AppService` starts in Pending; poll `appServices.waitForRunning`
 *    on the returned `id` until the companion app is live.
 * 3. Call `list(parentServiceId)` to view all attachments and their wiring status.
 * 4. Call `getCredentials(appServiceId)` to retrieve the companion app's admin
 *    credentials once it is running.
 */
export class AttachmentsAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Return the catalog of companion application kinds the platform supports.
   * Each entry describes the kind, display name, category, default plan, and
   * which parent database types it can be attached to.
   */
  async getCatalog(): Promise<AttachmentCatalogEntry[]> {
    const raw = await this.http.get<unknown>('/attachment-catalog')
    const result = toCamel<ListAttachmentCatalogResponse>(raw)
    return result.catalog
  }

  /**
   * Provision a companion application and attach it to a running managed
   * database service. The platform creates the app service, wires credentials
   * from the parent into the companion app's environment, and starts the
   * container. The returned `AppService` begins in Pending status; poll
   * `client.appServices.waitForRunning(appService.id)` until the companion app
   * is reachable.
   *
   * @param parentServiceId - ID of the managed database service to attach to.
   * @param req - Companion app kind, optional plan override, and optional subdomain.
   */
  async create(parentServiceId: string, req: CreateAttachmentRequest): Promise<AppService> {
    const body = toSnake(req)
    const raw = await this.http.post<unknown>(`/managed-services/${parentServiceId}/attachments`, body)
    return toCamel<AppService>(raw)
  }

  /**
   * List all companion-app attachments on a managed database service, including
   * their lifecycle status and wiring status.
   *
   * @param parentServiceId - ID of the managed database service.
   */
  async list(parentServiceId: string): Promise<AttachmentSummary[]> {
    const raw = await this.http.get<unknown>(`/managed-services/${parentServiceId}/attachments`)
    const result = toCamel<ListAttachmentsResponse>(raw)
    return result.attachments
  }

  /**
   * Retrieve admin credentials for a running companion app. The `adminPassword`
   * field is returned here for initial retrieval; store it securely as the
   * platform does not re-expose it after first retrieval.
   *
   * @param appServiceId - ID of the companion app service (from `AttachmentSummary.appServiceId`
   *   or the `AppService.id` returned by `create`).
   */
  async getCredentials(appServiceId: string): Promise<AttachmentCredentials> {
    const raw = await this.http.get<unknown>(`/app-services/${appServiceId}/attachment-credentials`)
    return toCamel<AttachmentCredentials>(raw)
  }
}
