// FoundryDB SDK - TypeScript type definitions

/**
 * Supported database engine types.
 *
 * Supported versions per engine:
 * - postgresql: 14, 15, 16, 17, 18
 * - mysql: 8.4
 * - mongodb: 6.0, 7.0, 8.0
 * - valkey: 7.2, 8.0, 8.1, 9.0
 * - kafka: 3.6, 3.7, 3.8, 3.9, 4.0
 * - opensearch: 2
 * - mssql: 4.8
 */
export type DatabaseType =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'valkey'
  | 'kafka'
  | 'opensearch'
  | 'mssql'
export type StorageTier = 'standard' | 'maxiops'
export type ServiceStatus =
  | 'pending'
  | 'provisioning'
  | 'running'
  | 'stopped'
  | 'error'
  | 'deleting'
  | 'deleted'
  | string

export interface FoundryDBConfig {
  /** Base URL of the FoundryDB API, e.g. https://api.foundrydb.com */
  apiUrl: string
  /** Basic auth username */
  username: string
  /** Basic auth password */
  password: string
  /** Optional request timeout in milliseconds (default: 30000) */
  timeoutMs?: number
  /**
   * Optional organization ID to scope all requests.
   * Sends the `X-Active-Org-ID` header on every service operation.
   * Can be overridden per-method via `organizationId` in the options object.
   */
  organizationId?: string
}

// ---- Organization models ----

export interface Organization {
  id: string
  name: string
  slug: string
  isPersonal: boolean
  createdAt: string
}

export interface ListOrganizationsResponse {
  organizations: Organization[]
}

// ---- Service models ----

export interface DNSRecord {
  fullDomain: string
  recordType: string
  value: string
}

export interface Service {
  id: string
  name: string
  databaseType: DatabaseType
  version: string
  status: ServiceStatus
  planName: string
  zone: string
  storageSizeGb: number
  storageTier: StorageTier
  createdAt: string
  updatedAt: string
  dnsRecords?: DNSRecord[]
  allowedCidrs?: string[]
  maintenanceWindow?: string
  isEphemeral?: boolean
  ttlHours?: number
  scheduledDeletionAt?: string
  preset?: string
  createdByAgentId?: string
  agentFramework?: string
  agentPurpose?: string
  labels?: Record<string, string>
  [key: string]: unknown
}

export interface ListServicesResponse {
  services: Service[]
}

// ---- Service preset models ----

export interface ServicePreset {
  id: string
  name: string
  description: string
  databaseType: string
  defaultVersion: string
  defaultPlan: string
  defaultStorageGb: number
  defaultStorageTier: string
  configTemplateId: string
  isEphemeral: boolean
  defaultTtlHours: number
  nodeCount: number
  replicationMode?: string
  extensions: string[]
  recommendedFeatures: string[]
  tags: string[]
}

export interface ListPresetsResponse {
  presets: ServicePreset[]
}

export type ReplicationMode = 'async' | 'sync' | string

export interface CreateServiceRequest {
  name: string
  databaseType: DatabaseType
  version: string
  planName: string
  zone: string
  storageSizeGb: number
  storageTier: StorageTier
  allowedCidrs?: string[]
  maintenanceWindow?: string
  /** Number of nodes in the cluster (1 for single-node, 2+ for HA). */
  nodeCount?: number
  /** Enable automatic failover for multi-node clusters. */
  autoFailoverEnabled?: boolean
  /** Replication mode: 'async' (default) or 'sync'. */
  replicationMode?: ReplicationMode
  /** Enable encryption at rest for the data volume. */
  encryptionEnabled?: boolean
  /** Service preset (e.g., "agent-valkey-session"). */
  preset?: string
  /** Mark this service as ephemeral (auto-deleted after TTL expires). */
  isEphemeral?: boolean
  /** Auto-delete the service after N hours (1-720). */
  ttlHours?: number
  /** Identifier of the AI agent that created this service. */
  createdByAgentId?: string
  /** AI framework used: langchain, crewai, autogen, claude, etc. */
  agentFramework?: string
  /** Purpose of the service: conversation_history, session_cache, etc. */
  agentPurpose?: string
  /** Custom key-value labels for the service. */
  labels?: Record<string, string>
  /**
   * Organization ID to create the service under.
   * Overrides the `organizationId` set on the client config.
   */
  organizationId?: string
}

export interface UpdateServiceRequest {
  name?: string
  allowedCidrs?: string[]
  maintenanceWindow?: string
  planName?: string
  storageSizeGb?: number
}

// ---- User / credential models ----

export interface DatabaseUser {
  username: string
  roles?: string[]
  createdAt?: string
  [key: string]: unknown
}

export interface ListUsersResponse {
  users: DatabaseUser[]
}

export interface RevealPasswordResponse {
  username: string
  password: string
  host: string
  port: number
  database: string
  connectionString: string
  [key: string]: unknown
}

// ---- Backup models ----

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | string
export type BackupType = 'full' | 'incremental' | 'pitr' | string

export interface Backup {
  id: string
  serviceId: string
  status: BackupStatus
  backupType: BackupType
  sizeBytes?: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
  [key: string]: unknown
}

export interface ListBackupsResponse {
  backups: Backup[]
}

export interface TriggerBackupResponse {
  backupId?: string
  [key: string]: unknown
}

// ---- Monitoring models ----

export interface ServiceMetrics {
  cpuUsagePercent?: number
  memoryUsagePercent?: number
  diskUsagePercent?: number
  connectionsActive?: number
  connectionsMax?: number
  replicationLagMs?: number
  queriesPerSecond?: number
  [key: string]: unknown
}

export interface LogsTaskResponse {
  taskId: string
}

export interface LogsResultResponse {
  status: string
  logs: string
}

// ---- App service models ----

/** Container configuration for an app service. */
export interface AppContainerConfig {
  imageRef: string
  containerPort: number
  env?: Record<string, string>
  customDomains?: string[]
  /**
   * Username for pulling from a private registry. Pair with
   * `registryPassword` (write-only: never returned by the API).
   */
  registryUsername?: string
  /**
   * Password for pulling from a private registry. Write-only: the API
   * accepts it on create/update but never returns it.
   */
  registryPassword?: string
  healthCheckPath?: string
  healthCheckIntervalSeconds?: number
  healthCheckTimeoutSeconds?: number
  healthCheckHealthyThreshold?: number
}

/** One phase of an app deploy, captured on the agent. */
export interface AppDeployStep {
  step: string
  status: string
  message?: string
  detail?: string
  startedAt: string
  durationMs?: number
}

/** A single revision in an app service's deploy history. */
export interface AppDeployment {
  id: string
  serviceId: string
  imageRef: string
  containerPort: number
  env?: Record<string, string>
  customDomains?: string[]
  registryUsername?: string
  reason?: string
  deployLogs?: AppDeployStep[]
  createdAt: string
}

/** A customer application container hosted on the platform. */
export interface AppService {
  id: string
  userId: string
  organizationId?: string
  name: string
  serviceKind: string
  status: string
  zone: string
  planName: string
  storageSizeGb: number
  storageTier?: string
  allowedCidrs?: string[]
  appConfig?: AppContainerConfig
  attachedServiceIds?: string[]
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

// ---- Auth-as-a-service types ----

/**
 * SMTP credentials used by the auth issuer to send magic-link emails.
 * Write-only at the API boundary: accepted on enable, stored in the
 * platform secret store, and never returned by any response.
 */
export interface AuthSmtpConfig {
  host: string
  port: number
  username: string
  /** Write-only: stored in the platform secret store, never returned. */
  password: string
  fromAddress: string
  fromName: string
  /**
   * Disable STARTTLS certificate verification. Set only for test mail
   * catchers that present a self-signed certificate; never set for
   * production SMTP relays.
   */
  insecureSkipVerify?: boolean
}

/** Branding applied to the hosted login pages. */
export interface AuthThemeConfig {
  logoUrl?: string
  brandColor?: string
  displayName?: string
  supportUrl?: string
}

/**
 * Supported social-login providers.
 * The set is closed: an unknown provider is rejected at enable time.
 */
export type AuthIdpProvider = 'google' | 'github' | string

/**
 * Enables one social-login provider at auth-enable time. `clientSecret`
 * is write-only: stored in the platform secret store and never returned.
 */
export interface AuthIdpProviderRequest {
  provider: AuthIdpProvider
  clientId: string
  /** Write-only: stored in the platform secret store, never returned. */
  clientSecret: string
  displayName?: string
}

/**
 * Stored, non-secret configuration of one social-login provider returned
 * on the `AuthConfiguration`. The `clientSecret` is never returned.
 */
export interface AuthIdpProviderConfig {
  provider: AuthIdpProvider
  clientId: string
  displayName?: string
}

/**
 * Request body for `AppServicesAPI.enableAuth`.
 *
 * `attachmentId` must reference an existing PostgreSQL attachment on the app.
 * `issuerDomainChoice` is `'fallback'` (an `auth-<id>.foundrydb.com` platform
 * subdomain) or `'custom'` and is fixed at enable time.
 * `smtp` is mandatory. `idpProviders` is optional; omit for magic-link only.
 */
export interface AuthEnableRequest {
  attachmentId: string
  /** 'fallback' | 'custom' — fixed at enable time. */
  issuerDomainChoice: 'fallback' | 'custom' | string
  smtp: AuthSmtpConfig
  theme: AuthThemeConfig
  /**
   * Social-login providers to enable (Google and/or GitHub). Each entry's
   * `clientSecret` is write-only and never returned. Omit for magic-link only.
   */
  idpProviders?: AuthIdpProviderRequest[]
}

/**
 * One auth enablement record for an app service. Holds enablement state
 * only; the identity data lives in the customer's own PostgreSQL database.
 * Secret custody locations are never serialized.
 */
export interface AuthConfiguration {
  id: string
  userId: string
  organizationId?: string
  appServiceId: string
  databaseServiceId: string
  attachmentId: string
  issuerUrl: string
  fallbackDomain: string
  customDomain?: string
  status: string
  schemaVersionApplied: string
  failureReason?: string
  theme: AuthThemeConfig
  /** Configured social-login providers without their secrets. */
  idpProviders: AuthIdpProviderConfig[]
  authAppServiceId?: string
  createdAt: string
  updatedAt: string
}

/**
 * Controller-side record of one JWT signing keypair. The key material is
 * held in the platform secret store; only the kid, algorithm, and lifecycle
 * status are exposed.
 */
export interface AuthSigningKey {
  id: string
  authConfigurationId: string
  kid: string
  algorithm: string
  /** pending | active | retiring | retired | revoked */
  status: string
  activatedAt?: string
  retiredAt?: string
  createdAt: string
  updatedAt: string
}

/** Response for `AppServicesAPI.getAuth` and `AppServicesAPI.enableAuth`. */
export interface AuthConfigurationWithKeys {
  auth: AuthConfiguration
  signingKeys: AuthSigningKey[]
}

/** Response for `AppServicesAPI.revokeAuthSession`. */
export interface RevokeSessionResponse {
  taskId: string
}

// ---- Error types ----

export interface APIErrorBody {
  error?: string
  message?: string
  [key: string]: unknown
}

export class FoundryDBError extends Error {
  readonly statusCode: number
  readonly body: APIErrorBody

  constructor(message: string, statusCode: number, body: APIErrorBody) {
    super(message)
    this.name = 'FoundryDBError'
    this.statusCode = statusCode
    this.body = body
  }
}
