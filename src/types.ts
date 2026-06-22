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
 * Request body for `AppServicesAPI.upsertAuthProvider`. Creates or replaces
 * the OAuth app credentials for one social-login provider after auth is
 * enabled. `clientSecret` is write-only: stored in the platform secret store
 * and never returned by any read endpoint.
 */
export interface UpsertAuthProviderRequest {
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

// ---- Edge gateway models ----

/**
 * Lifecycle status of a custom domain attached to an app service through the
 * edge tier.
 */
export type EdgeDomainStatus =
  | 'pending_verification'
  | 'verifying'
  | 'issuing_certificate'
  | 'propagating'
  | 'active'
  | 'failed'
  | 'deleting'
  | string

/**
 * A customer custom domain attached to an app service. The platform serves
 * traffic for the domain from the edge tier once the status reaches active.
 */
export interface EdgeDomain {
  id: string
  serviceId: string
  userId: string
  domain: string
  status: EdgeDomainStatus
  certificateId?: string
  verificationCheckedAt?: string
  errorMessage?: string
  /** Platform hostname the customer points their DNS CNAME record at. */
  cnameTarget: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export interface ListEdgeDomainsResponse {
  domains: EdgeDomain[]
}

/** Body for adding a custom domain to an app service. */
export interface CreateEdgeDomainRequest {
  domain: string
}

/** Selects how the edge WAF treats matching requests for one app. */
export type EdgeWAFMode = 'off' | 'detect' | string

/** Selects what a rate-limit bucket is keyed on. */
export type EdgeRateLimitKey = 'ip' | 'api_key' | string

/** Caches responses under one path prefix for a fixed TTL. */
export interface EdgeCacheRule {
  pathPrefix: string
  ttlSeconds: number
}

/** Token-bucket rate limit enforced per PoP at the edge. */
export interface EdgeRateLimit {
  requestsPerSecond: number
  burst: number
  key: EdgeRateLimitKey
}

/**
 * Customer-tunable edge settings. Domains and origin are platform-derived and
 * are not settable here.
 */
export interface EdgeSettingsRequest {
  cacheRules?: EdgeCacheRule[]
  rateLimit?: EdgeRateLimit
  wafMode?: EdgeWAFMode
}

/** Convergence state of one PoP in the edge fleet. */
export interface EdgeApplicationStatusItem {
  zone: string
  appliedVersion: number
  status: string
  errorMessage?: string
}

/**
 * Edge overview for an app service: whether the edge tier is enabled, the home
 * PoP, the CNAME target, and how far the fleet has converged on the current
 * config version.
 */
export interface EdgeStatus {
  edgeEnabled: boolean
  homePop?: string
  /** Platform hostname custom domains point their CNAME at. */
  cnameTarget?: string
  configVersion: number
  applications?: EdgeApplicationStatusItem[]
}

/**
 * Customer-tunable edge settings returned after an update, plus the config
 * version the fleet will converge on.
 */
export interface EdgeSettings {
  cacheRules?: EdgeCacheRule[]
  rateLimit?: EdgeRateLimit
  wafMode: EdgeWAFMode
  configVersion: number
}

// ---- Auth GDPR erasure types ----

/**
 * Request body for erasing one end-user (GDPR right to erasure, Art. 17).
 * Set exactly one of `email` or `userId`.
 */
export interface DeleteAppServiceAuthUserRequest {
  /** Email of the end-user to erase. Mutually exclusive with `userId`. */
  email?: string
  /**
   * Auth subject UUID of the end-user to erase. Mutually exclusive with
   * `email`.
   */
  userId?: string
}

/** Response returned by auth user erasure operations. */
export interface AuthUserErasureResponse {
  taskId: string
}

// ---- App jobs types ----

/** One job definition on an app service. */
export interface AppJob {
  id: string
  serviceId: string
  name: string
  /** Five-field cron expression. Null means the job has no schedule. */
  scheduleCron?: string
  timezone: string
  enabled: boolean
  /** Image reference override for this job; absent means inherit from the app. */
  imageRef?: string
  /** Container argv override (exec form). */
  command?: string[]
  /** Environment variables layered over the app's environment at dispatch time. */
  env?: Record<string, string>
  maxRetries: number
  retryBackoffSeconds: number
  maxRuntimeSeconds: number
  concurrencyCap: number
  overlapPolicy: string
  nextRunAt?: string
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}

/** One execution (or recorded skip) of a job. */
export interface AppJobInvocation {
  id: string
  jobId: string
  serviceId: string
  /** queued | running | succeeded | failed | timed_out | skipped */
  status: string
  attempt: number
  triggeredBy: string
  triggeredByUserId?: string
  agentTaskId?: string
  unitName?: string
  scheduledFor?: string
  queuedAt: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  exitCode?: number
  errorMessage?: string
  /** Trailing log lines captured by the agent into the invocation result. */
  logTail?: string
  retryEnqueued: boolean
  createdAt: string
  updatedAt: string
}

/** Log lines captured for one invocation. */
export interface AppJobLogLines {
  lines: string[]
  logFilePath: string
  truncatedAt?: number
}

/**
 * Poll response for an invocation logs fetch task. Status mirrors the agent
 * task lifecycle. `result` is set once the status is COMPLETED.
 */
export interface AppJobInvocationLogs {
  taskId: string
  /** PENDING | DISPATCHED | IN_PROGRESS | COMPLETED | FAILED | TIMEOUT | CANCELLED */
  status: string
  result?: AppJobLogLines
  errorMessage?: string
}

/** Body for creating a new job definition. */
export interface AppJobCreateRequest {
  name: string
  scheduleCron?: string
  timezone?: string
  enabled?: boolean
  imageRef?: string
  command?: string[]
  env?: Record<string, string>
  maxRetries?: number
  retryBackoffSeconds?: number
  maxRuntimeSeconds?: number
  concurrencyCap?: number
}

/**
 * Body for updating a job definition. Unset fields keep their current value.
 * Set `clearSchedule` to `true` to remove the schedule; set `clearImageRef`
 * to `true` to revert to the app image.
 */
export interface AppJobPatchRequest {
  scheduleCron?: string
  clearSchedule?: boolean
  timezone?: string
  enabled?: boolean
  imageRef?: string
  clearImageRef?: boolean
  command?: string[]
  env?: Record<string, string>
  maxRetries?: number
  retryBackoffSeconds?: number
  maxRuntimeSeconds?: number
  concurrencyCap?: number
}

// ---- Queue types ----

/**
 * A named message queue hosted on a PostgreSQL managed service. Status is one
 * of Pending, Provisioning, Active, Deprovisioning, or Failed.
 */
export interface Queue {
  id: string
  userId: string
  organizationId?: string
  serviceId: string
  name: string
  databaseName: string
  /**
   * How long (seconds) a claimed message stays invisible before a crashed
   * consumer's claim expires and the message is redelivered.
   */
  visibilityTimeoutSeconds: number
  /** How many delivery attempts a message gets before it is dropped or dead-lettered. */
  maxAttempts: number
  dlqEnabled: boolean
  status: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

/** Body for creating a queue. */
export interface QueueCreateRequest {
  name: string
  databaseName?: string
  visibilityTimeoutSeconds?: number
  maxAttempts?: number
  dlqEnabled?: boolean
}

/** One message in a batch enqueue request. */
export interface QueueEnqueueMessage {
  /** Arbitrary JSON payload. */
  payload: Record<string, unknown>
  /** Delay first visibility by this many seconds. */
  delaySeconds?: number
}

/** Body for enqueueing a batch of messages (up to 100 per call). */
export interface QueueEnqueueRequest {
  messages: QueueEnqueueMessage[]
}

/** Message IDs assigned to a completed enqueue batch, in request order. */
export interface QueueEnqueueMessageIds {
  messageIds: number[]
}

/**
 * Poll response for an enqueue task. `result` holds the assigned message IDs
 * once the status is COMPLETED.
 */
export interface QueueEnqueueResult {
  taskId: string
  status: string
  result?: QueueEnqueueMessageIds
}

/** Per-queue depth snapshot. */
export interface QueueStats {
  queueName: string
  readyMessages: number
  inflightMessages: number
  deadMessages: number
  oldestAgeSeconds: number
}

/**
 * Poll response for a queue stats task. `result` holds the depth snapshot
 * once the status is COMPLETED.
 */
export interface QueueStatsResult {
  taskId: string
  status: string
  result?: QueueStats
}

// ---- File service types ----

/** One S3 bucket backing a files service. */
export interface FilesBucket {
  region: string
  bucket: string
  endpoint: string
}

/** Configuration and measured usage for a files service. */
export interface FilesConfig {
  buckets: FilesBucket[]
  quotaGbSoft: number
  quotaGbHard: number
  versioning: boolean
  sse: boolean
  lifecycleEnabled: boolean
  measuredBytes: number
  measuredAt?: string
  overQuota: boolean
}

/** A managed S3-compatible object storage service. */
export interface FilesService {
  id: string
  userId: string
  organizationId?: string
  name: string
  serviceKind: string
  status: string
  zone: string
  filesConfig?: FilesConfig
  createdAt: string
  updatedAt: string
}

/** Body for provisioning a new files service. */
export interface CreateFilesServiceRequest {
  name: string
  zone?: string
  quotaGbSoft?: number
  quotaGbHard?: number
  organizationId?: string
}

/** One scoped S3 credential for a files service. */
export interface FilesAccessKey {
  id: string
  serviceId: string
  userId: string
  organizationId?: string
  name: string
  accessKeyId: string
  prefix: string
  /** 'read' | 'write' | 'readwrite' */
  permissions: string
  /** 'user' | 'attachment' */
  purpose: string
  /** 'active' | 'revoked' */
  status: string
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
  revokedAt?: string
}

/**
 * Response for `FileServicesAPI.createAccessKey`. The `secretAccessKey` is
 * returned exactly once and cannot be retrieved again.
 */
export interface FilesAccessKeyWithSecret extends FilesAccessKey {
  secretAccessKey: string
}

/** Body for minting a new access key. */
export interface CreateFilesAccessKeyRequest {
  name: string
  prefix?: string
  /** 'read' | 'write' | 'readwrite' */
  permissions: string
}

/** Body for presigning one S3 operation. */
export interface PresignFilesUrlRequest {
  /** 'GET' | 'PUT' | 'HEAD' | 'DELETE' */
  method: string
  key: string
  expiresSeconds?: number
  contentType?: string
}

/** A presigned URL and its validity window. */
export interface FilesPresignedUrl {
  url: string
  method: string
  expiresAt: string
}

/** One object in a bucket listing. */
export interface FilesObject {
  key: string
  size: number
  lastModified: string
  etag: string
}

/** One page of a bucket listing. */
export interface FilesObjectPage {
  objects: FilesObject[]
  nextCursor?: string
}

// ---- Inference types ----

/** API view of one configured AI provider for an organization. */
export interface InferenceProviderConfig {
  id: string
  provider: string
  baseUrl?: string
  euEndpoint: boolean
  enabled: boolean
  hasApiKey: boolean
  euResident: boolean
  createdAt: string
  updatedAt: string
}

/** Body for creating or replacing a provider configuration. */
export interface UpsertInferenceProviderRequest {
  /** 'openai' | 'anthropic' | 'mistral' | 'azure_openai' */
  provider: string
  apiKey: string
  baseUrl?: string
  euEndpoint?: boolean
  enabled?: boolean
}

/** API view of one data-plane inference key. */
export interface InferenceKey {
  id: string
  name: string
  keyPrefix: string
  monthlyTokenLimit: number
  rateLimitRpm: number
  status: string
  tokensUsedCycle: number
  cycleMonth: string
  createdAt: string
  revokedAt?: string
}

/**
 * Response for `InferenceAPI.createKey`. The `secret` is returned exactly
 * once and cannot be retrieved again.
 */
export interface CreateInferenceKeyResult {
  key: InferenceKey
  secret: string
}

/** Body for minting a new data-plane key. */
export interface CreateInferenceKeyRequest {
  name: string
  monthlyTokenLimit: number
  rateLimitRpm?: number
}

/** Org-wide inference proxy policy. */
export interface OrgInferenceSettings {
  organizationId: string
  euOnly: boolean
  monthlyCostLimitCents: number
  circuitOpen: boolean
  circuitOpenedAt?: string
  updatedAt: string
}

/** Body for updating org-wide inference proxy policy. */
export interface UpdateOrgInferenceSettingsRequest {
  euOnly?: boolean
  monthlyCostLimitCents?: number
  /** Set to `true` to close an open cost circuit. */
  resetCircuit?: boolean
}

/** One aggregated row in an inference usage report. */
export interface InferenceUsageRow {
  groupKey: string
  provider: string
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costMicrocents: number
}

/** Aggregated inference usage for an organization. */
export interface InferenceUsageSummary {
  from: string
  to: string
  groupBy: string
  rows: InferenceUsageRow[]
}

/** Filters for `InferenceAPI.getUsage`. */
export interface InferenceUsageOptions {
  /** RFC 3339 start timestamp. */
  from?: string
  /** RFC 3339 end timestamp. */
  to?: string
  /** 'model' | 'key' */
  groupBy?: string
}

// ---- Data pipeline types ----

/** Identifies a data pipeline topology. */
export type DataPipelineType = 'cdc_pg_to_kafka' | string

/** Optional configuration for a data pipeline. */
export interface DataPipelineConfig {
  databaseName?: string
  tables?: string[]
  topicPrefix?: string
  snapshotMode?: string
}

/** A data flow between two managed services. */
export interface DataPipeline {
  id: string
  organizationId: string
  name: string
  pipelineType: DataPipelineType
  sourceServiceId: string
  sinkServiceId: string
  status: string
  provisionStep?: string
  config: DataPipelineConfig
  connectorName?: string
  publicationName?: string
  slotName?: string
  topicPrefix?: string
  lastConnectorState?: string
  sourceLagBytes?: number
  lastHealthCheckAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

/** Body for creating a data pipeline. */
export interface CreateDataPipelineRequest {
  name: string
  pipelineType: DataPipelineType
  sourceServiceId: string
  sinkServiceId: string
  config?: DataPipelineConfig
}

/** Live status of a data pipeline, including connector and task states. */
export interface DataPipelineStatus {
  id: string
  status: string
  connectorName?: string
  connectorState?: string
  taskStates?: unknown
  sourceLagBytes?: number
  topicPrefix?: string
  lastHealthCheckAt?: string
  errorMessage?: string
}

// ---- Embedding pipeline types ----

/** Selects how a pipeline processes its source table. */
export type EmbeddingPipelineMode = 'continuous' | 'scheduled' | 'manual' | string

/** One auto-vectorization pipeline on a managed PostgreSQL service. */
export interface EmbeddingPipeline {
  id: string
  serviceId: string
  databaseName: string
  sourceSchema: string
  sourceTable: string
  textColumns: string[]
  modelProvider: string
  embeddingModel: string
  modelDimensions: number
  targetSchema: string
  targetTable: string
  providerBaseUrl?: string
  batchSize: number
  pollIntervalSeconds: number
  mode: EmbeddingPipelineMode
  scheduleCron?: string
  sourceFilter?: string
  maxRowRetries: number
  nextRunAt?: string
  status: string
  errorMessage?: string
  rowsProcessed: number
  rowsPending: number
  tokensUsed: number
  lastProcessedAt?: string
  lastError?: string
  createdAt: string
  updatedAt: string
}

/** Body for creating an embedding pipeline. */
export interface CreateEmbeddingPipelineRequest {
  databaseName: string
  sourceSchema?: string
  sourceTable: string
  textColumns: string[]
  modelProvider: string
  embeddingModel: string
  modelDimensions: number
  targetTable?: string
  targetSchema?: string
  /** Write-only: sent to the provider for embedding, never returned. */
  providerApiKey: string
  providerBaseUrl?: string
  batchSize?: number
  pollIntervalSeconds?: number
  mode?: EmbeddingPipelineMode
  scheduleCron?: string
  sourceFilter?: string
  maxRowRetries?: number
}

/**
 * Body for updating an embedding pipeline. Only the set fields are changed.
 * `providerApiKey` is write-only.
 */
export interface UpdateEmbeddingPipelineRequest {
  embeddingModel?: string
  modelDimensions?: number
  /** Write-only: updates the stored provider key. */
  providerApiKey?: string
  providerBaseUrl?: string
  batchSize?: number
  pollIntervalSeconds?: number
  mode?: EmbeddingPipelineMode
  scheduleCron?: string
  sourceFilter?: string
  maxRowRetries?: number
}

/** One failed source row sample from an embedding run. */
export interface EmbeddingRunErrorSample {
  sourceRowId: string
  error: string
}

/** One discrete embedding job execution (scheduled or manual pipeline). */
export interface EmbeddingPipelineRun {
  id: string
  pipelineId: string
  status: string
  trigger: string
  startedAt?: string
  finishedAt?: string
  rowsScanned: number
  rowsEmbedded: number
  rowsFailed: number
  tokensUsed: number
  errorMessage?: string
  errorSample?: EmbeddingRunErrorSample[]
  createdAt: string
}

// ---- Webhook and event types ----

/** A customer-configured HTTP endpoint that receives signed event notifications. */
export interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  active: boolean
  /** Signing secret, returned only in the create response. */
  secret?: string
  createdAt: string
  updatedAt: string
  consecutiveFailures: number
  totalDelivered: number
  totalFailed: number
  lastSuccessAt?: string
  lastFailureAt?: string
  disabledAt?: string
  disabledReason?: string
}

/** One entry in a webhook endpoint's delivery history. */
export interface WebhookDelivery {
  id: string
  webhookId: string
  eventId?: string
  eventType: string
  status: string
  attemptCount: number
  nextRetryAt?: string
  responseStatus?: number
  responseBody?: string
  deliveredAt?: string
  failedAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

/** Body for registering a webhook endpoint. */
export interface CreateWebhookRequest {
  url: string
  /** Event types to subscribe to. An empty list subscribes to all events. */
  events: string[]
}

/** One entry in the cursor-paginated event feed. */
export interface WebhookEvent {
  seq: number
  id: string
  organizationId?: string
  serviceId?: string
  eventType: string
  /** Raw event data as returned by the API. */
  data: unknown
  createdAt: string
}

/** Options for listing events. */
export interface ListEventsOptions {
  /** Cursor value from a previous page's `nextCursor`; omit to start at the newest event. */
  cursor?: number
  /** Page size cap (server default 50, maximum 200). */
  limit?: number
  /** Filter to a single event type. */
  eventType?: string
}

/** One page of the event feed. */
export interface ListEventsResponse {
  events: WebhookEvent[]
  nextCursor?: number
}

// ---- AI actions types ----

/** How a client acts on a feed item: the safety tier, target, and deep link. */
export interface AIActionRef {
  type: string
  tier: string
  target: string
  href: string
}

/**
 * One prioritized entry in the AI actions feed. `kind` is `index` or
 * `advisory`; `severity` is `critical`, `warning`, or `info`.
 */
export interface AIActionItem {
  id: string
  kind: string
  severity: string
  serviceId: string
  serviceName: string
  title: string
  summary: string
  action: AIActionRef
  createdAt: string
}

/** The AI actions feed envelope. */
export interface AIActionsResponse {
  items: AIActionItem[]
  total: number
  truncated: boolean
}

/** Filters for `AIActionsAPI.list`. */
export interface AIActionsListOptions {
  serviceId?: string
  /** 'index' | 'advisory' */
  kind?: string
  /** Minimum severity: 'info' | 'warning' | 'critical' */
  severity?: string
  limit?: number
}

/** Body for the copilot plan endpoint. */
export interface CopilotPlanRequest {
  intent: string
  serviceId?: string
}

/** One proposed step in a copilot plan. */
export interface CopilotStep {
  tool: string
  args?: Record<string, unknown>
  tier: string
  preview: string
  rationale?: string
}

/** A previewable plan produced by the copilot. */
export interface CopilotPlan {
  summary: string
  steps: CopilotStep[]
  unsupported: boolean
  note?: string
}

/** Body for executing one confirm-tier AI action. */
export interface ExecuteAIActionRequest {
  actionType: string
  serviceId: string
  args?: Record<string, unknown>
  confirm: boolean
}

/** Result envelope for an AI action execution attempt. */
export interface ExecuteAIActionResult {
  actionType: string
  /** 'executed' | 'failed' | 'rejected' */
  status: string
  httpStatus: number
  message: string
  detail?: unknown
}

/** API view of one persisted Action Center execution. */
export interface AIActionExecution {
  id: string
  organizationId?: string
  serviceId: string
  actionType: string
  targetId?: string
  status: string
  httpStatus: number
  actorUserId?: string
  createdAt: string
  revertedAt?: string
  revertStatus?: string
}

/** Execution history envelope. */
export interface AIActionExecutionListResponse {
  executions: AIActionExecution[]
  totalCount: number
}

/** Filters for `AIActionsAPI.listExecutions`. */
export interface AIActionExecutionsListOptions {
  serviceId?: string
  limit?: number
}

/** Response envelope for an accepted rollback. */
export interface AIActionRollbackResult {
  executionId: string
  actionType: string
  revertStatus: string
  message: string
  taskId?: string
}

// ---- Vector search types ----

/** pgvector distance operator. */
export type VectorSearchMetric = 'cosine' | 'l2' | 'ip' | string

/** One column filter applied to a vector search. */
export interface VectorSearchFilter {
  column: string
  /** Only 'eq' is currently supported. */
  op: string
  value: string | number | boolean
}

/** Body for a vector search request. */
export interface VectorSearchRequest {
  databaseName: string
  schema?: string
  table: string
  embeddingColumn?: string
  /** Pre-computed query vector. Mutually exclusive with `queryText`. */
  vector?: number[]
  /**
   * Natural-language query text. Requires `pipelineId` so the platform can
   * embed the text with the same model that produced the indexed vectors.
   */
  queryText?: string
  pipelineId?: string
  topK?: number
  metric?: VectorSearchMetric
  filters?: VectorSearchFilter[]
  includeColumns?: string[]
}

/** One result column descriptor. */
export interface VectorSearchColumn {
  name: string
  type: string
}

/** Vector search result, with the search parameters echoed back. */
export interface VectorSearchResponse {
  columns: VectorSearchColumn[]
  rows: unknown[][]
  rowCount: number
  truncated: boolean
  executionMs: number
  metric: VectorSearchMetric
  topK: number
}

// ---- Compliance evidence packet types ----

/** Attestation status of a single compliance control. */
export type ControlAssertionStatus = 'attested' | 'not_attestable' | 'out_of_scope'

/** One assessed control in a compliance packet. */
export interface ControlAssertion {
  controlId: string
  title: string
  assertion: string
  status: ControlAssertionStatus
  evidenceRefs: string[]
}

/** Audit log summary embedded in a compliance packet. */
export interface ComplianceAuditLogSummary {
  retentionPolicy: string
  oldestEntryAt?: string
  entryCount: number
}

/** High-level metrics embedded in a compliance packet. */
export interface CompliancePacketSummary {
  serviceCount: number
  allServicesEuResidency: boolean
  auditLog: ComplianceAuditLogSummary
}

/** Organization snapshot embedded in a compliance packet. */
export interface ComplianceOrganizationSnapshot {
  id: string
  name: string
  billingEmail?: string
  country?: string
}

/**
 * A signed compliance evidence packet. `schemaVersion` identifies the packet
 * layout; consumers should gate on it before parsing `controls`.
 */
export interface CompliancePacket {
  schemaVersion: string
  framework: string
  generatedAt: string
  periodStart: string
  periodEnd: string
  organization: ComplianceOrganizationSnapshot
  scopeBoundary: string
  controls: ControlAssertion[]
  summary: CompliancePacketSummary
}

/** Detached cryptographic signature over the canonical form of a packet. */
export interface CompliancePacketSignature {
  algorithm: string
  keyId: string
  value: string
  canonicalSha256: string
}

/** A compliance packet together with its detached signature. */
export interface CompliancePacketResponse {
  packet: CompliancePacket
  signature: CompliancePacketSignature
}

/**
 * Response from generating a compliance report. Extends `CompliancePacketResponse`
 * with the durable `reportId` that can be used to re-download the packet later.
 */
export interface GenerateComplianceReportResponse extends CompliancePacketResponse {
  reportId: string
}

/**
 * Index record for one generated compliance report. The full packet is
 * not embedded; use `downloadComplianceReportJSON` or
 * `downloadComplianceReportPDF` to retrieve it.
 */
export interface ComplianceReportRecord {
  id: string
  organizationId: string
  framework: string
  schemaVersion: string
  periodStart: string
  periodEnd: string
  generatedAt: string
  generatedBy: string
  signingKeyId: string
  algorithm: string
  status: string
  hasPdf: boolean
}

/** One entry in the compliance signing key set. */
export interface ComplianceSigningKey {
  keyId: string
  algorithm: string
  publicKey: string
  active: boolean
  retiredAt?: string
}

/**
 * Well-known compliance signing key set. Published at
 * `GET /.well-known/compliance-signing-keys` without authentication so that
 * auditors and relying parties can verify packet signatures independently.
 */
export interface ComplianceSigningKeySet {
  algorithm: string
  keys: ComplianceSigningKey[]
}

/**
 * A compliance framework subscription for an organization. Controls which
 * frameworks are active and billed for the organization.
 */
export interface ComplianceSubscription {
  /** The compliance framework this subscription covers. */
  framework: 'soc2' | 'gdpr_ropa' | 'dora' | 'eu_ai_act'
  /** Whether the subscription is currently active. */
  enabled: boolean
  /** Monthly price for this framework in EUR. */
  monthlyPriceEur: number
  /** ISO 8601 timestamp when the organization subscribed to this framework. */
  subscribedAt?: string
  /** ISO 8601 timestamp when the subscription was canceled, if applicable. */
  canceledAt?: string
}

// ---- Companion-app attachment types ----

/**
 * The set of companion applications that can be click-attached to a managed
 * database service. The list grows over time; treat unknown values as strings.
 */
export type AttachmentKind =
  | 'metabase'
  | 'directus'
  | 'hasura'
  | 'nocodb'
  | 'open-webui'
  | string

/**
 * One entry in the attachment catalog. Describes a companion application kind
 * that the platform can provision and wire to a parent managed service.
 */
export interface AttachmentCatalogEntry {
  /** Stable machine identifier for the companion app. */
  kind: AttachmentKind
  /** Human-readable name shown in the UI. */
  displayName: string
  /** Short description of what the companion app provides. */
  description: string
  /** Grouping category (e.g. "analytics", "cms", "api"). */
  category: string
  /** Default compute plan used when no `planName` is supplied on create. */
  defaultPlan: string
  /**
   * Database types the companion app can be attached to (e.g. ["postgresql"]).
   * An empty array means the app has no parent-kind restriction.
   */
  requiresParentKinds: string[]
}

/**
 * Summary record returned by `listAttachments`. Provides enough information
 * to display an attachment in a list without fetching the full app service.
 */
export interface AttachmentSummary {
  /** Platform-assigned attachment record identifier. */
  attachmentId: string
  /** ID of the app service backing this companion app. */
  appServiceId: string
  /** Companion app kind (e.g. "metabase"). */
  kind: AttachmentKind
  /** Display name of the companion app service. */
  name: string
  /** Lifecycle status of the underlying app service. */
  status: string
  /**
   * Whether the platform has completed wiring the companion app to the parent
   * service (injecting credentials, setting env vars, etc.).
   */
  wiringStatus: string
  /** Public HTTPS URL of the companion app, once running. */
  url?: string
}

/**
 * Credentials returned for a companion app. The specific fields present depend
 * on the companion app kind; only non-secret fields are returned in the
 * standard response. `generated` carries any additional key-value pairs minted
 * during post-deploy wiring.
 */
export interface AttachmentCredentials {
  /** Admin email address for UIs that require email-based login. */
  adminEmail?: string
  /**
   * Admin password. Write-only at create time; returned once here for
   * initial retrieval. Store it securely; the platform does not re-expose it
   * after first retrieval.
   */
  adminPassword?: string
  /** Additional key-value credential pairs specific to the companion app. */
  generated?: Record<string, string>
  /** Direct URL to the companion app login page. */
  loginUrl?: string
}

/** Body for creating a companion-app attachment on a managed service. */
export interface CreateAttachmentRequest {
  /** The companion app kind to provision (e.g. "metabase"). */
  kind: AttachmentKind
  /** Compute plan for the companion app service. Defaults to the catalog entry's `defaultPlan`. */
  planName?: string
  /**
   * Subdomain prefix for the companion app's public URL.
   * If omitted the platform generates one from the kind and service name.
   */
  subdomain?: string
}

// ---- Stack marketplace types ----

/**
 * Visibility scope of a custom stack template. Private templates are visible
 * only to the creating user; org_shared templates are visible to all members
 * of the owning organization; public templates appear in the marketplace.
 */
export type StackVisibility = 'private' | 'org_shared' | 'public'

/**
 * Publication lifecycle of a custom stack template. A template must be
 * submitted for review before it can be published to the marketplace.
 */
export type StackPublicationStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'unpublished'

/**
 * The descriptor body that defines the resources and wiring of a stack.
 * The structure mirrors the server-side stack descriptor schema.
 */
export type StackDescriptor = Record<string, unknown>

/** A customer-authored stack template stored on the platform. */
export interface CustomStackTemplate {
  /** Platform-assigned template identifier. */
  id: string
  /** Stable machine identifier used to reference this template. */
  name: string
  /** Human-readable name shown in the UI. */
  displayName: string
  /** Short description of what this template provisions. */
  description: string
  /** Semantic version string for this template. */
  version: string
  /** Who can see this template. */
  visibility: StackVisibility
  /** Publication workflow state. */
  publicationStatus: StackPublicationStatus
  /** The full stack descriptor that defines resources and wiring. */
  descriptor: StackDescriptor
  /** Organization that owns this template. */
  orgId: string
  createdAt: string
  updatedAt: string
}

/** Body for creating a new custom stack template. */
export interface CustomTemplateRequest {
  /** Stable machine identifier for the template. */
  name: string
  /** Human-readable name shown in the UI. */
  displayName: string
  /** Short description of what the template provisions. */
  description: string
  /** Semantic version string (defaults to "1.0.0" if omitted). */
  version?: string
  /** Initial visibility scope (defaults to "private" if omitted). */
  visibility?: StackVisibility
  /** The stack descriptor that defines resources and wiring. */
  descriptor: StackDescriptor
}

/** One resource change within an upgrade plan. */
export interface ResourceChange {
  /** Kind of the affected resource (e.g. "database", "files", "app"). */
  resourceType: string
  /** Platform-assigned identifier of the affected resource. */
  resourceId: string
  /** Nature of the change: 'add', 'remove', or 'modify'. */
  changeType: 'add' | 'remove' | 'modify' | string
  /** Human-readable description of what will change. */
  description?: string
  /** Monthly cost of the resource before the upgrade, in EUR. */
  oldCostEurMonthly?: number
  /** Monthly cost of the resource after the upgrade, in EUR. */
  newCostEurMonthly?: number
}

/**
 * A plan describing the resource changes and cost impact of upgrading a
 * running stack to a newer template version.
 */
export interface StackUpgradePlan {
  /** ID of the stack being upgraded. */
  stackId: string
  /** Template version currently in use. */
  currentVersion: string
  /** Template version the upgrade targets. */
  targetVersion: string
  /** Per-resource change list. */
  resourceChanges: ResourceChange[]
  /** Total estimated monthly cost after the upgrade, in EUR. */
  totalCostEurMonthly: number
  /** Estimated unavailability window during the upgrade, in seconds. */
  estimatedDowntimeSeconds?: number
}

/** A record of one executed stack upgrade. */
export interface StackMigration {
  /** Platform-assigned migration identifier. */
  id: string
  /** ID of the stack being migrated. */
  stackId: string
  /** Template version before the migration. */
  fromVersion: string
  /** Template version being migrated to. */
  toVersion: string
  /** Lifecycle status of the migration. */
  status: string
  /** Timestamp when the migration started. */
  startedAt: string
  /** Timestamp when the migration completed (set on terminal states). */
  completedAt?: string
  /** Error message if the migration failed. */
  error?: string
}

// ---- Stack types ----

/** The lifecycle status of a stack. */
export type StackStatus =
  | 'Pending'
  | 'Provisioning'
  | 'Wiring'
  | 'Running'
  | 'RollingBack'
  | 'Failed'
  | 'Deleting'
  | 'Deleted'

/** The resource kind of a constituent stack resource. */
export type StackResourceKind = 'database' | 'files' | 'inference' | 'app'

/**
 * One line item in a stack cost preview. `isCeiling` is true when the cost is
 * enforced as a hard monthly ceiling rather than an estimate.
 */
export interface StackCostLineItem {
  /** Stable symbolic name for this resource (e.g. "primary_db"). */
  symbolicName: string
  /** Resource kind: database, files, inference, or app. */
  kind: StackResourceKind
  /** Human-readable description of what this resource is. */
  description: string
  /** Estimated or ceiling monthly cost in the preview currency. */
  monthlyCost: number
  /** When true, this cost is a hard monthly ceiling, not a soft estimate. */
  isCeiling: boolean
}

/**
 * A cost preview for a stack template. Returned by `previewStack` and
 * optionally embedded in `StackTemplate.costPreview`.
 */
export interface StackCostPreview {
  /** Template name the preview applies to. */
  templateName: string
  /** ISO 4217 currency code for all monetary values in this preview (e.g. "EUR"). */
  currency: string
  /** Sum of all line-item monthly costs. */
  monthlyTotal: number
  /** Per-resource cost breakdown. */
  lineItems: StackCostLineItem[]
  /** Optional billing or quota warnings to surface to the caller. */
  warnings?: string[]
}

/** An available stack template visible in the template catalog. */
export interface StackTemplate {
  /** Stable machine identifier for the template (used in `launchStack`). */
  name: string
  /** Human-readable name shown in the UI. */
  displayName: string
  /** Short description of what this stack provisions. */
  description: string
  /** Template schema version string. */
  version: string
  /** Optional pre-computed cost preview for the default configuration. */
  costPreview?: StackCostPreview
}

/**
 * One constituent resource within a provisioned stack. Resources are
 * provisioned in dependency order according to their `sequence` and
 * `dependsOn` fields.
 */
export interface StackResource {
  /** Platform-assigned resource record identifier. */
  id: string
  /** ID of the parent stack. */
  stackId: string
  /** Stable symbolic name within the template (e.g. "primary_db"). */
  symbolicName: string
  /** Resource kind: database, files, inference, or app. */
  kind: StackResourceKind
  /** ID of the managed service created for this resource, once provisioned. */
  serviceId?: string
  /** External reference identifier (provider-level ID if applicable). */
  refId?: string
  /** Lifecycle status of this resource. */
  status: StackStatus
  /** Human-readable detail about the current status or last error. */
  statusDetail: string
  /**
   * Symbolic names of resources this resource depends on. The platform
   * waits for all dependencies to reach Running before provisioning this one.
   */
  dependsOn: string[]
  /** Provisioning sequence number within the stack (lower runs first). */
  sequence: number
  createdAt: string
  updatedAt: string
}

/** A provisioned stack instance. */
export interface Stack {
  /** Platform-assigned stack identifier. */
  id: string
  /** User-assigned name for this stack instance. */
  name: string
  /** Template the stack was launched from. */
  templateName: string
  /** Template version the stack was launched from. */
  templateVersion: string
  /** Aggregate lifecycle status of the stack. */
  status: StackStatus
  /** Human-readable detail about the current status or last error. */
  statusDetail: string
  /** Public entry-point URL for the stack once it is Running (e.g. the app URL). */
  endpointUrl: string
  /** Accepted monthly cost supplied at launch time. */
  estimatedMonthlyCost: number
  /** Organization the stack belongs to, if org-scoped. */
  organizationId?: string
  /**
   * ID of the custom template this stack was launched from, if launched from
   * a custom (marketplace or org-shared) template rather than a built-in one.
   */
  sourceTemplateId?: string
  /**
   * Organization ID of the publisher that owns the source custom template,
   * if the template was discovered via the marketplace.
   */
  sourcePublisherOrgId?: string
  /** Constituent resources, included when the API returns full detail. */
  resources?: StackResource[]
  createdAt: string
  updatedAt: string
}

/** Body for previewing the cost of a stack template. */
export interface PreviewStackRequest {
  /** Template name to preview (from `listStackTemplates`). */
  templateName: string
  /**
   * ID of a custom stack template to preview (from `getTemplate` or
   * `listMyTemplates`). Mutually exclusive with `templateName` when referring
   * to a custom template.
   */
  templateId?: string
}

/** Body for launching a new stack. */
export interface LaunchStackRequest {
  /** User-assigned name for the stack instance. */
  name: string
  /** Template to launch (from `listStackTemplates`). */
  templateName: string
  /**
   * ID of a custom stack template to launch (from `getTemplate` or
   * `listMyTemplates`). Mutually exclusive with `templateName` when referring
   * to a custom template.
   */
  templateId?: string
  /**
   * Organization to create the stack under.
   * Overrides the `organizationId` set on the client config.
   */
  organizationId?: string
  /**
   * Accepted monthly cost in the template's preview currency. Must match
   * the `monthlyTotal` returned by `previewStack`. The platform rejects
   * the request if the live cost exceeds this value.
   */
  acceptedMonthlyCost: number
  /**
   * Optional per-resource overrides keyed by symbolic name. Each entry may
   * supply a `planName`, `zone`, or other template-exposed parameter.
   */
  overrides?: Record<string, Record<string, unknown>>
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
