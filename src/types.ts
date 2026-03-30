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
  [key: string]: unknown
}

export interface ListServicesResponse {
  services: Service[]
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
