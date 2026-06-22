import type { HTTPClient } from './client.js'
import { toCamel } from './client.js'
import type {
  GenerateComplianceReportResponse,
  ComplianceReportRecord,
  CompliancePacketResponse,
  ComplianceSigningKeySet,
  ComplianceSubscription,
} from './types.js'

/** Supported compliance frameworks. */
export type ComplianceFramework = 'soc2' | 'gdpr_ropa' | 'dora' | 'eu_ai_act' | string

interface ListComplianceReportsResponse {
  reports: ComplianceReportRecord[]
}

interface ListComplianceSubscriptionsResponse {
  subscriptions: ComplianceSubscription[]
}

/**
 * Generates and retrieves signed compliance evidence packets for an
 * organization. Packets are cryptographically signed by the platform; the
 * public signing keys are discoverable at
 * `GET /.well-known/compliance-signing-keys` without authentication.
 *
 * All methods that are scoped to an organization require `orgId`. The
 * `complianceSigningKeys` method is unauthenticated and requires no `orgId`.
 */
export class ComplianceAPI {
  constructor(private readonly http: HTTPClient) {}

  /**
   * Generate a new compliance evidence packet for the given organization and
   * framework. The packet is signed with the platform's active signing key and
   * persisted so it can be re-downloaded later via `downloadComplianceReportJSON`
   * or `downloadComplianceReportPDF`.
   *
   * @param orgId - Organization ID to generate the report for.
   * @param framework - Compliance framework: `'soc2'` or `'gdpr_ropa'`.
   */
  async generateComplianceReport(
    orgId: string,
    framework: ComplianceFramework,
  ): Promise<GenerateComplianceReportResponse> {
    const raw = await this.http.post<unknown>(
      `/organizations/${orgId}/compliance-reports`,
      { framework },
    )
    return toCamel<GenerateComplianceReportResponse>(raw)
  }

  /**
   * List all compliance reports generated for the given organization, ordered
   * newest first. Each record contains metadata and a `hasPdf` flag; the full
   * packet is retrieved via `downloadComplianceReportJSON` or
   * `downloadComplianceReportPDF`.
   *
   * @param orgId - Organization ID to list reports for.
   */
  async listComplianceReports(orgId: string): Promise<ComplianceReportRecord[]> {
    const raw = await this.http.get<unknown>(`/organizations/${orgId}/compliance-reports`)
    const result = toCamel<ListComplianceReportsResponse>(raw)
    return result.reports
  }

  /**
   * Download a previously generated compliance report as a signed JSON packet.
   * The returned object contains the full `CompliancePacket` and its detached
   * `CompliancePacketSignature`.
   *
   * @param orgId - Organization ID the report belongs to.
   * @param reportId - Report ID returned by `generateComplianceReport` or `listComplianceReports`.
   */
  async downloadComplianceReportJSON(
    orgId: string,
    reportId: string,
  ): Promise<CompliancePacketResponse> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/compliance-reports/${reportId}`,
    )
    return toCamel<CompliancePacketResponse>(raw)
  }

  /**
   * Download a previously generated compliance report as a PDF. Returns the
   * raw bytes as a `Uint8Array` for maximum compatibility across Node.js,
   * Deno, Bun, and browser runtimes.
   *
   * @param orgId - Organization ID the report belongs to.
   * @param reportId - Report ID returned by `generateComplianceReport` or `listComplianceReports`.
   */
  async downloadComplianceReportPDF(orgId: string, reportId: string): Promise<Uint8Array> {
    return this.http.getBinary(
      `/organizations/${orgId}/compliance-reports/${reportId}/pdf`,
    )
  }

  /**
   * Fetch the platform's well-known compliance signing key set. This endpoint
   * is public and requires no authentication; auditors and relying parties can
   * call it directly to verify packet signatures without needing API credentials.
   */
  async complianceSigningKeys(): Promise<ComplianceSigningKeySet> {
    const raw = await this.http.getPublic<unknown>('/.well-known/compliance-signing-keys')
    return toCamel<ComplianceSigningKeySet>(raw)
  }

  /**
   * List all compliance framework subscriptions for the given organization.
   * Each entry indicates whether the framework is currently enabled, its monthly
   * price, and relevant timestamps.
   *
   * @param orgId - Organization ID to list subscriptions for.
   */
  async listComplianceSubscriptions(orgId: string): Promise<ComplianceSubscription[]> {
    const raw = await this.http.get<unknown>(
      `/organizations/${orgId}/compliance-subscriptions`,
    )
    const result = toCamel<ListComplianceSubscriptionsResponse>(raw)
    return result.subscriptions
  }

  /**
   * Subscribe the given organization to a compliance framework. Idempotent:
   * if the organization is already subscribed, the existing subscription is
   * returned unchanged.
   *
   * @param orgId - Organization ID to subscribe.
   * @param framework - Compliance framework to enable, e.g. `'soc2'`.
   */
  async subscribeComplianceFramework(
    orgId: string,
    framework: ComplianceFramework,
  ): Promise<ComplianceSubscription> {
    const raw = await this.http.put<unknown>(
      `/organizations/${orgId}/compliance-subscriptions/${framework}`,
      {},
    )
    return toCamel<ComplianceSubscription>(raw)
  }

  /**
   * Unsubscribe the given organization from a compliance framework. The
   * subscription is canceled at the end of the current billing period.
   *
   * @param orgId - Organization ID to unsubscribe.
   * @param framework - Compliance framework to disable, e.g. `'soc2'`.
   */
  async unsubscribeComplianceFramework(
    orgId: string,
    framework: ComplianceFramework,
  ): Promise<void> {
    await this.http.delete<void>(
      `/organizations/${orgId}/compliance-subscriptions/${framework}`,
    )
  }

  /**
   * Rotate the platform's compliance signing key. The current active key is
   * retired and a new key is generated and activated. All subsequent reports
   * will be signed with the new key; existing reports remain verifiable via
   * the retired key entry in the well-known key set.
   *
   * This is an admin-only operation.
   */
  async rotateComplianceSigningKey(): Promise<ComplianceSigningKeySet> {
    const raw = await this.http.post<unknown>('/admin/compliance/signing-keys/rotate')
    return toCamel<ComplianceSigningKeySet>(raw)
  }
}
