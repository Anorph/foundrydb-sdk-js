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
export type EdgeWAFMode = 'off' | 'detect' | 'block' | string

/**
 * Action a matching custom WAF rule takes: `block` denies the request with a
 * 403 (only enforced in block waf_mode), `log` only records a match.
 */
export type EdgeWAFRuleAction = 'block' | 'log' | string

/** Selects what a rate-limit bucket is keyed on. */
export type EdgeRateLimitKey = 'ip' | 'api_key' | string

/**
 * Counter location for a rate-limit bucket. Platform-set by the controller and
 * only echoed on the settings response.
 */
export type EdgeRateLimitBackend = 'in_process' | 'valkey' | string

/**
 * Load-balancing policy across the combined upstream set (the primary auto
 * origin plus the pool's additional origins).
 */
export type EdgeOriginLBPolicy =
  | 'round_robin'
  | 'weighted'
  | 'least_conn'
  | 'first'
  | string

/** Where an inbound API key is read from on a request. */
export type EdgeAPIKeyLocation = 'header' | 'query' | string

/** Action the bot-management heuristic takes on a flagged request. */
export type EdgeBotAction = 'log' | 'block' | 'challenge' | string

/** Action account-takeover protection takes when a threshold is crossed. */
export type EdgeATOAction = 'alert' | 'ratelimit' | 'lock' | string

/**
 * Cache-key derivation for a cache rule. Each list narrows what the cache
 * varies on; an empty key varies on the request path and method only.
 */
export interface EdgeCacheKey {
  varyQueryParams?: string[]
  varyHeaders?: string[]
  varyCookies?: string[]
}

/**
 * Caches responses under one path prefix for a fixed TTL. The cache-depth
 * fields tune stale serving, the derived cache key, and request collapsing.
 */
export interface EdgeCacheRule {
  pathPrefix: string
  ttlSeconds: number
  /** Serve a stale entry for up to this long while revalidating in the background. */
  staleWhileRevalidateSeconds?: number
  /** Serve a stale entry for up to this long when the origin errors. */
  staleIfErrorSeconds?: number
  /** Overrides how the cache key is derived for this rule. */
  cacheKey?: EdgeCacheKey
  /** Collapses concurrent misses for the same key into a single origin fetch. */
  requestCollapsing?: boolean
}

/**
 * Token-bucket rate limit enforced per PoP at the edge. `requestsPerSecond`,
 * `burst` and `key` are customer-tunable; `backend`, `backendAddress` and
 * `nodeCount` are platform-set and only echoed on a response.
 */
export interface EdgeRateLimit {
  requestsPerSecond: number
  burst: number
  key: EdgeRateLimitKey
  /** Counter location. Empty is treated as in-process. Platform-set. */
  backend?: EdgeRateLimitBackend
  /** Valkey host:port when backend is valkey; empty otherwise. Platform-set. */
  backendAddress?: string
  /** Number of serving nodes the in-process limit is spread across. Platform-set. */
  nodeCount?: number
}

/** Matches a named request header's value against a regex. */
export interface EdgeWAFRuleHeaderMatch {
  name: string
  valuePattern: string
}

/**
 * A safe, structured per-app WAF rule the edge compiles into a coraza SecRule.
 * The customer supplies only opaque metadata and a small set of match patterns,
 * never raw SecRule directive text. All match fields are optional; at least one
 * is required, and multiple set fields are ANDed.
 */
export interface EdgeWAFRule {
  name?: string
  description?: string
  uriPattern?: string
  method?: string
  header?: EdgeWAFRuleHeaderMatch
  sourceIpCidr?: string
  action: EdgeWAFRuleAction
}

/**
 * One WAF managed-rule exclusion: suppress a core-rule-set rule entirely (by
 * `ruleId`) or only for a named `target`. At least one of the two is set.
 */
export interface EdgeWAFExclusion {
  ruleId?: number
  target?: string
}

/**
 * Per-IP volumetric DDoS protection at the edge. Empty knobs fall back to the
 * platform defaults.
 */
export interface EdgeDDoSProfile {
  enabled: boolean
  perIpRequestsPerSecond?: number
  perIpBurst?: number
  perIpConnCap?: number
}

/**
 * Bot-management heuristics at the edge. `action` selects what a flagged
 * request gets; the boolean toggles enable the known-bad-bot list and the
 * rate-based heuristic.
 */
export interface EdgeBotManagement {
  enabled: boolean
  action?: EdgeBotAction
  knownBadBots?: boolean
  rateBasedHeuristic?: boolean
}

/**
 * Account-takeover protection: watches authentication endpoints for credential
 * stuffing and takes `action` when a per-IP or per-username failure threshold
 * is crossed.
 */
export interface EdgeATOProtection {
  enabled: boolean
  authPaths?: string[]
  failureStatusCodes?: number[]
  perIpThresholdPerMin?: number
  perUsernameThresholdPerMin?: number
  usernameField?: string
  action?: EdgeATOAction
}

/** One JWT claim that must be present (and equal to `value`) for a request to pass. */
export interface EdgeJWTClaim {
  name: string
  value: string
}

/**
 * JWT validation at the edge for the listed paths. Tokens are verified against
 * a JWKS URL or static public keys; matching claims can be forwarded to the
 * origin in a header. Carries no secret.
 */
export interface EdgeJWTAuth {
  enabled: boolean
  paths?: string[]
  jwksUrl?: string
  publicKeys?: string[]
  issuer?: string
  audiences?: string[]
  requiredClaims?: EdgeJWTClaim[]
  forwardClaimsHeader?: string
}

/**
 * Signed-URL enforcement at the edge. The signing secret is referenced by name
 * (a platform secret) and never carried inline; the same shape is echoed on the
 * response because no secret value is stored.
 */
export interface EdgeSignedURLs {
  enabled: boolean
  paths?: string[]
  /** Reference name of the signing secret, never the secret value itself. */
  secretName?: string
  ttlSeconds?: number
  /** Query parameter carrying the signature. Default "sig". */
  signatureParam?: string
  /** Query parameter carrying the expiry. Default "exp". */
  expiresParam?: string
}

/**
 * One inbound API key on the settings request. `key` is the PLAINTEXT key the
 * controller hashes and discards; it is write-only and never echoed. `rateTier`
 * is an optional per-key rate limit.
 */
export interface EdgeAPIKeyRequest {
  name: string
  /** Plaintext key, write-only, hashed server-side, never returned. */
  key?: string
  rateTier?: EdgeRateLimit
}

/**
 * Inbound API-key authentication on the settings request. `keys` carries the
 * plaintext key material that the controller hashes and discards.
 */
export interface EdgeAPIKeyAuthRequest {
  enabled: boolean
  paths?: string[]
  /** Where the key is read from. Default "header". */
  keyLocation?: EdgeAPIKeyLocation
  /** Header or query parameter name carrying the key. Default "X-API-Key". */
  keyName?: string
  keys?: EdgeAPIKeyRequest[]
}

/**
 * Non-secret view of one configured API key, echoed on the settings response.
 * Carries no hash and no plaintext.
 */
export interface EdgeAPIKeyView {
  name: string
  rateTier?: EdgeRateLimit
}

/**
 * Non-secret view of the API-key auth setting echoed on the settings response.
 * The `keys` list carries only names and optional per-key rate tiers.
 */
export interface EdgeAPIKeyAuthView {
  enabled: boolean
  paths?: string[]
  keyLocation?: EdgeAPIKeyLocation
  keyName?: string
  keys?: EdgeAPIKeyView[]
}

/**
 * Redirects a request whose path exactly matches `fromPath` to `toUrl` with an
 * HTTP redirect status (301, 302, 307, 308; 0 means the default 302). It
 * short-circuits at the edge before WAF, cache, or origin.
 */
export interface EdgeRedirectRule {
  fromPath: string
  toUrl: string
  statusCode?: number
}

/**
 * Closed enum of actions an edge rule may take. Terminal actions (redirect,
 * block, origin_override) short-circuit the rule chain (first match wins);
 * non-terminal actions (set_header, rewrite, continue) fall through.
 */
export type EdgeRuleActionType =
  | 'redirect'
  | 'set_header'
  | 'rewrite'
  | 'block'
  | 'origin_override'
  | 'continue'
  | string

/**
 * Matches a named request header. Exactly one of `value` (exact) or `regex`
 * (RE2) is used; `value` takes precedence when both are set.
 */
export interface EdgeRuleHeaderMatch {
  name: string
  value?: string
  regex?: string
}

/**
 * ANDed set of conditions an edge rule matches on. Every set condition must
 * hold; an empty match matches every request.
 */
export interface EdgeRuleMatch {
  pathPrefix?: string
  pathRegex?: string
  methods?: string[]
  header?: EdgeRuleHeaderMatch
}

/**
 * Closed-enum action a matched edge rule takes. Only the fields relevant to
 * `type` are used.
 */
export interface EdgeRuleAction {
  type: EdgeRuleActionType
  redirectTo?: string
  redirectStatus?: number
  setRequestHeaders?: Record<string, string>
  removeRequestHeaders?: string[]
  setResponseHeaders?: Record<string, string>
  removeResponseHeaders?: string[]
  rewrite?: string
  blockStatus?: number
  originOverride?: EdgeOrigin
}

/**
 * One entry in the additive, ordered, composable edge rules engine: a match
 * plus a closed-enum action. Rules are evaluated in ascending priority order
 * (ties broken by declared index) and compose with the fixed edge features at a
 * single documented precedence point.
 */
export interface EdgeRule {
  name?: string
  priority?: number
  match: EdgeRuleMatch
  action: EdgeRuleAction
}

/**
 * Manipulates HTTP headers at the edge. `requestSet`/`requestRemove` apply to
 * the request forwarded to the origin; `responseSet`/`responseRemove` apply to
 * the response returned to the client.
 */
export interface EdgeHeaderRules {
  requestSet?: Record<string, string>
  requestRemove?: string[]
  responseSet?: Record<string, string>
  responseRemove?: string[]
}

/**
 * Per-app CORS policy the edge enforces. `allowedOrigins` is either the single
 * wildcard "*" (only when `allowCredentials` is false) or a list of concrete
 * http(s) origins.
 */
export interface EdgeCORS {
  allowedOrigins?: string[]
  allowedMethods?: string[]
  allowedHeaders?: string[]
  exposeHeaders?: string[]
  allowCredentials?: boolean
  maxAgeSeconds?: number
}

/**
 * Puts an app behind a maintenance page at the edge. When enabled, every client
 * except those whose connection IP is inside a `bypassIps` CIDR gets the
 * maintenance response.
 */
export interface EdgeMaintenance {
  enabled: boolean
  statusCode?: number
  body?: string
  bypassIps?: string[]
}

/**
 * Enables gzip response compression at the edge. `extraContentTypes` adds
 * further content-types beyond the runtime defaults.
 */
export interface EdgeCompression {
  enabled: boolean
  extraContentTypes?: string[]
}

/**
 * Enables an HTTP Strict-Transport-Security response header at the edge.
 * Preload requires `includeSubdomains` and a max-age of at least one year.
 */
export interface EdgeHSTS {
  enabled: boolean
  maxAgeSeconds?: number
  includeSubdomains?: boolean
  preload?: boolean
}

/**
 * Injects a per-request correlation id at the edge on both the request
 * forwarded to the origin and the response returned to the client. Empty
 * `headerName` defaults to X-Request-ID.
 */
export interface EdgeRequestID {
  enabled: boolean
  headerName?: string
}

/**
 * Routes a sticky subset of an app's traffic into a canary (B) arm at the edge.
 * A request is routed into the canary arm when it carries `matchCookie` or
 * `matchHeader` (exactly one is set) with `matchValue`.
 */
export interface EdgeCanary {
  enabled: boolean
  matchCookie?: string
  matchHeader?: string
  matchValue?: string
  variantHeaderName?: string
  variantHeaderValue?: string
}

/** Active (out-of-band) origin health probing. */
export interface EdgeOriginHealthCheckActive {
  enabled: boolean
  path?: string
  intervalSeconds?: number
  timeoutSeconds?: number
  expectStatus?: number
}

/** Passive (in-band) origin health detection. */
export interface EdgeOriginHealthCheckPassive {
  maxFails?: number
  failDurationSeconds?: number
  unhealthyStatus?: number[]
}

/** Per-app origin health-check policy. Either or both may be set. */
export interface EdgeOriginHealthCheck {
  active?: EdgeOriginHealthCheckActive
  passive?: EdgeOriginHealthCheckPassive
}

/**
 * One upstream the edge proxies an app's traffic to. `floatingIp` is set only
 * on the platform-derived primary origin and is read-only.
 */
export interface EdgeOrigin {
  floatingIp?: string
  host?: string
  port: number
  sni?: string
  weight?: number
  backup?: boolean
}

/**
 * Per-app set of additional origins beyond the primary auto origin, with the
 * load-balancing policy and failover knobs.
 */
export interface EdgeOriginPool {
  additionalOrigins?: EdgeOrigin[]
  lbPolicy?: EdgeOriginLBPolicy
  tryDurationSeconds?: number
  retries?: number
  retryStatuses?: number[]
}

/**
 * One inbound Basic Auth account on the settings request. `password` is the
 * PLAINTEXT password the controller bcrypt-hashes and discards; it is
 * write-only and never echoed. An empty password for an existing username keeps
 * that account's stored hash.
 */
export interface EdgeBasicAuthAccountRequest {
  username: string
  password?: string
}

/**
 * Inbound Basic Auth setting on the settings request. It carries plaintext
 * passwords that the controller hashes and discards.
 */
export interface EdgeBasicAuthRequest {
  enabled: boolean
  accounts?: EdgeBasicAuthAccountRequest[]
}

/**
 * Customer-tunable subset of the edge config, written via PUT
 * /app-services/{id}/edge/settings. Domains and origin are platform-derived and
 * not settable here. Each list/pointer field replaces the stored value
 * wholesale; an empty or nil value clears the corresponding setting.
 */
export interface EdgeSettingsRequest {
  cacheRules?: EdgeCacheRule[]
  rateLimit?: EdgeRateLimit
  wafMode?: EdgeWAFMode
  customWafRules?: EdgeWAFRule[]
  ipAllowList?: string[]
  ipDenyList?: string[]
  redirects?: EdgeRedirectRule[]
  headerRules?: EdgeHeaderRules
  cors?: EdgeCORS
  maintenance?: EdgeMaintenance
  compression?: EdgeCompression
  maxRequestBodyBytes?: number
  allowedMethods?: string[]
  basicAuth?: EdgeBasicAuthRequest
  blockedPaths?: string[]
  hsts?: EdgeHSTS
  requestId?: EdgeRequestID
  canary?: EdgeCanary
  healthCheck?: EdgeOriginHealthCheck
  originPool?: EdgeOriginPool
  /**
   * Opts the app into staged per-node/per-PoP config rollouts: a new config
   * version is dispatched to a canary subset (one node, or one PoP) first and
   * held for a manual promote (with auto-abort on a canary 5xx spike) instead of
   * being dispatched fleet-wide immediately.
   */
  canaryRolloutEnabled?: boolean
  /** Additive, ordered, composable rules engine list. Replaces the stored list wholesale. */
  rules?: EdgeRule[]
  /** JWT validation at the edge for the listed paths. */
  jwtAuth?: EdgeJWTAuth
  /** Signed-URL enforcement at the edge. */
  signedUrls?: EdgeSignedURLs
  /** Inbound API-key authentication; plaintext key material is write-only. */
  apiKeyAuth?: EdgeAPIKeyAuthRequest
  /** WAF core-rule-set paranoia level (1..4); 0 selects the platform default PL1. */
  wafParanoiaLevel?: number
  /** WAF managed-rule exclusions. */
  wafRuleExclusions?: EdgeWAFExclusion[]
  /** Per-IP volumetric DDoS protection. */
  ddosProfile?: EdgeDDoSProfile
  /** Bot-management heuristics. */
  botManagement?: EdgeBotManagement
  /** Account-takeover protection on authentication endpoints. */
  atoProtection?: EdgeATOProtection
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
 * Customer-tunable edge settings returned after an update (and on GET
 * .../edge/settings). Basic Auth password hashes are never echoed; only the
 * enabled flag and usernames are returned. `signedUrls` and `apiKeyAuth` are
 * projected to their non-secret view shapes.
 */
export interface EdgeSettings {
  cacheRules?: EdgeCacheRule[]
  rateLimit?: EdgeRateLimit
  wafMode: EdgeWAFMode
  customWafRules?: EdgeWAFRule[]
  ipAllowList?: string[]
  ipDenyList?: string[]
  redirects?: EdgeRedirectRule[]
  headerRules?: EdgeHeaderRules
  cors?: EdgeCORS
  maintenance?: EdgeMaintenance
  compression?: EdgeCompression
  maxRequestBodyBytes?: number
  allowedMethods?: string[]
  basicAuthEnabled: boolean
  basicAuthUsernames?: string[]
  blockedPaths?: string[]
  hsts?: EdgeHSTS
  requestId?: EdgeRequestID
  canary?: EdgeCanary
  healthCheck?: EdgeOriginHealthCheck
  originPool?: EdgeOriginPool
  /** Whether the app opts into staged per-node/per-PoP config rollouts. */
  canaryRolloutEnabled: boolean
  /** Additive, ordered, composable rules engine list; empty means no rules. */
  rules?: EdgeRule[]
  /** JWT validation echoed back; carries no secret. */
  jwtAuth?: EdgeJWTAuth
  /** Signed-URL enforcement echoed back; the secret is referenced by name only. */
  signedUrls?: EdgeSignedURLs
  /** Non-secret view of API-key auth: names and per-key rate tiers, no key material. */
  apiKeyAuth?: EdgeAPIKeyAuthView
  /** WAF core-rule-set paranoia level (1..4); 0 means platform default PL1. */
  wafParanoiaLevel?: number
  /** WAF managed-rule exclusions. */
  wafRuleExclusions?: EdgeWAFExclusion[]
  /** Per-IP volumetric DDoS protection. */
  ddosProfile?: EdgeDDoSProfile
  /** Bot-management heuristics. */
  botManagement?: EdgeBotManagement
  /** Account-takeover protection. */
  atoProtection?: EdgeATOProtection
  configVersion: number
}

/**
 * Body of POST /app-services/{id}/edge/cache/purge. Set exactly one form:
 * `all` drops every cached entry for the app on the fleet, or `paths`
 * invalidates the cached entries under each listed absolute path.
 */
export interface EdgeCachePurgeRequest {
  all?: boolean
  paths?: string[]
}

/**
 * Rolling purge plan the request started. The purge flushes nodes one at a time
 * in the background, so the endpoint returns the plan rather than the completed
 * result.
 */
export interface EdgeCachePurgeResponse {
  plannedNodes: number
  nodeIds?: string[]
  rolling: boolean
}

/** One (path, count) entry of a top-paths or suspicious-paths list. */
export interface EdgeMetricsTopPath {
  path: string
  count: number
}

/** Request totals broken down by HTTP status class. */
export interface EdgeStatusClassCounts {
  '2xx': number
  '3xx': number
  '4xx': number
  '5xx': number
}

/** Cache hit/miss summary with the derived hit ratio. */
export interface EdgeCacheCounts {
  hit: number
  miss: number
  hitRatio: number
}

/** Latency percentiles (milliseconds) estimated from the latency histogram. */
export interface EdgeLatencyPercentiles {
  p50: number
  p95: number
  p99: number
}

/**
 * Per-scope security/threat summary: the WAF detection total plus the observed
 * top paths matching credential-scanner shapes.
 */
export interface EdgeAnalyticsThreat {
  wafDetectionsTotal: number
  suspiciousPaths: EdgeMetricsTopPath[]
}

/**
 * Folded edge analytics for one scope (the app total or one PoP) over the
 * window. `zone` is empty for the app-wide total.
 */
export interface EdgeAnalyticsSummary {
  zone?: string
  requestsTotal: number
  byStatusClass: EdgeStatusClassCounts
  errorRatePct: number
  cache: EdgeCacheCounts
  rateLimitedTotal: number
  wafDetectionsTotal: number
  wafByRule?: Record<string, number>
  latencyMs: EdgeLatencyPercentiles
  topPaths: EdgeMetricsTopPath[]
  threat: EdgeAnalyticsThreat
}

/**
 * GET /app-services/{id}/edge/analytics response: an account-scoped,
 * server-aggregated edge analytics summary for one app over a time window,
 * folded across the app's PoPs with a per-PoP breakdown.
 */
export interface EdgeAnalytics {
  windowMinutes: number
  total: EdgeAnalyticsSummary
  pops: EdgeAnalyticsSummary[]
}

/** How a log drain transforms the client IP before a line leaves the platform. */
export type EdgeIPRedactionMode =
  | 'full'
  | 'truncated'
  | 'hashed'
  | 'omitted'
  | string

/**
 * Per-drain privacy policy applied to every access log line before export.
 * Authorization and Cookie are always dropped regardless of `headerAllowList`.
 */
export interface EdgeRedactionPolicy {
  ipMode?: EdgeIPRedactionMode
  ipHashSalt?: string
  stripQueryString?: boolean
  headerAllowList?: string[]
}

/**
 * Streams an app's per-request edge access logs to a customer destination. The
 * destination configuration is write-only and never returned.
 */
export interface EdgeLogDrain {
  id: string
  appServiceId: string
  name: string
  description: string
  destinationType: string
  redactionPolicy: EdgeRedactionPolicy
  isEnabled: boolean
  exportIntervalSeconds: number
  lastExportAt?: string
  lastExportError?: string
  consecutiveFailures: number
  createdAt: string
  updatedAt: string
}

/**
 * Creates an edge access-log drain. Configuration is destination-specific (s3:
 * endpoint/region/bucket/prefix/access_key_id/secret_access_key; webhook:
 * url/auth_header_name/auth_header_value).
 */
export interface CreateEdgeLogDrainRequest {
  name: string
  description?: string
  destinationType: string
  configuration: Record<string, unknown>
  redactionPolicy?: EdgeRedactionPolicy
  isEnabled?: boolean
  exportIntervalSeconds?: number
}

/** Partial update of a log drain; omitted fields keep their value. */
export interface UpdateEdgeLogDrainRequest {
  name?: string
  description?: string
  destinationType?: string
  configuration?: Record<string, unknown>
  redactionPolicy?: EdgeRedactionPolicy
  isEnabled?: boolean
  exportIntervalSeconds?: number
}

export interface ListEdgeLogDrainsResponse {
  drains: EdgeLogDrain[]
}

/** Reports whether a drain's destination is reachable. */
export interface EdgeLogDrainTestResult {
  ok: boolean
  error?: string
}

/**
 * One entry in the append-only edge config version history. The live edge
 * configuration is the source of truth for what is active; this history is the
 * immutable audit trail and the source a rollback restores from.
 */
export interface EdgeConfigVersion {
  version: number
  configHash: string
  /**
   * What produced this version: "reconcile" (a platform recompute bump),
   * "settings" (a customer settings write), or "rollback" (a restore of a prior
   * version's customer-settable subset).
   */
  source: string
  /** User that initiated the change, when attributable. Null for reconciler bumps. */
  createdBy?: string
  createdAt: string
  /** Whether this version is the currently active (live) version. */
  active: boolean
  /** For a rollback version, the version whose subset it restored. */
  rolledBackFrom?: number
}

/**
 * GET /app-services/{id}/edge/versions response: the app's edge config version
 * history (newest first, bounded) and the live active version.
 */
export interface EdgeConfigVersions {
  activeVersion: number
  versions: EdgeConfigVersion[]
}

/**
 * Names the version to roll back to. Supply exactly one of `toVersion` (an
 * explicit positive version) or `to` set to "previous".
 */
export interface EdgeRollbackRequest {
  toVersion?: number
  to?: string
}

/**
 * Reports the new active version a rollback produced. The rollback writes a NEW
 * forward version restoring the target's customer-settable subset; it never
 * mutates the history.
 */
export interface EdgeRollbackResponse {
  activeVersion: number
  rolledBackFrom: number
  source: string
}

/**
 * One staged edge config rollout. A rollout stages a new config version to a
 * canary subset (one node, or one PoP) first, then either promotes it to the
 * rest of the fleet or aborts.
 */
export interface EdgeRollout {
  id: string
  targetVersion: number
  /**
   * One of "canary" (held on the subset), "promoting" (fanning out), "promoted"
   * (whole fleet converged), or "aborted" (the rest was never given the version).
   */
  phase: string
  /** "node" (selector is a VM UUID) or "pop" (selector is a zone code). */
  canaryScope: string
  canarySelector?: string
  startedAt: string
  updatedAt: string
  promotedAt?: string
  abortedAt?: string
  abortReason?: string
}

/**
 * GET /app-services/{id}/edge/rollout response: the app's current (or most
 * recent) rollout. `active` reports whether the rollout is in a non-terminal
 * phase; `rollout` is null when the app has never had a rollout.
 */
export interface EdgeRolloutStatus {
  active: boolean
  rollout?: EdgeRollout
}

/**
 * Carries an optional operator note recorded as the rollout's abort reason. An
 * empty reason records a default "manual abort" note.
 */
export interface EdgeRolloutAbortRequest {
  reason?: string
}

// ---- Edge fleet administration (admin only) ----
//
// The platform-owned edge gateway PoPs (points of presence) are created,
// scaled, rolled, and retired only through the admin endpoints under
// /admin/edge. A PoP is one edge service with nodeCount >= 2 (a primary that
// holds the serving floating IP plus one or more hot standbys), giving in-house
// intra-PoP high availability via floating-IP handoff on failure.

/**
 * The admin-facing shape of one edge PoP. `nodeCount` and `targetNodeCount`
 * expose the PoP's primary-plus-standby sizing for HA.
 */
export interface EdgeNode {
  id: string
  name: string
  zone: string
  planName: string
  status: string
  nodeCount: number
  targetNodeCount: number
}

/** Wraps the admin list-nodes envelope. */
export interface ListEdgeNodesResponse {
  nodes: EdgeNode[]
}

/**
 * Provisions one new edge PoP via POST /admin/edge/nodes. `zone` is required;
 * the service name is derived. `nodeCount` optionally widens the PoP beyond the
 * default primary-plus-standby pair; values below the default are raised to it.
 */
export interface CreateEdgeNodeRequest {
  zone: string
  planName?: string
  nodeCount?: number
}

/**
 * Sets an edge PoP's desired VM count via PATCH /admin/edge/nodes/{nodeId}.
 * `nodeCount` must be at least 1; 2 or more keeps the PoP highly available.
 */
export interface EdgeNodeScaleRequest {
  nodeCount: number
}

/**
 * An edge PoP's image-roll progress. `inProgress` is true while any node still
 * predates the roll request; `remainingOldNodes` counts those old running nodes
 * and `replacedNodes` counts the running nodes already on the new image.
 */
export interface EdgeRollStatus {
  inProgress: boolean
  requestedAt?: string
  targetNodes: number
  runningNodes: number
  remainingOldNodes: number
  replacedNodes: number
}

/**
 * The static edge autoscale policy (display only). None of these values feeds a
 * live scaling decision from the overview endpoint.
 */
export interface EdgeAutoscaleConfig {
  enabled: boolean
  maxNodes: number
  scaleUpRps: number
  scaleDownRps: number
  cooldownSeconds: number
  lookbackSeconds: number
}

/**
 * Per-PoP autoscale telemetry for display; it never influences scaling. It is
 * present only when current load or an autoscaler evaluation is available.
 */
export interface EdgeAutoscaleState {
  currentRps: number
  perNodeRps: number
  lastDecision: string
  lastActionAt?: string
  cooldownRemainingSeconds: number
}

/**
 * One VM in an edge PoP. `isServing` marks the node currently holding the
 * serving floating IP.
 */
export interface EdgeOverviewNode {
  id: string
  name: string
  role: string
  status: string
  isServing: boolean
}

/**
 * An in-flight HA auto-recovery cycle for a PoP (self-heal replacement,
 * failover, scale-out). Present on an overview row only while recovery is
 * active.
 */
export interface EdgeRecoveryStatus {
  inProgress: boolean
  phase?: string
  startedAt?: string
  estimatedEta?: string
}

/**
 * One PoP row of the edge overview: its node roster, serving floating IP, node
 * deficit, in-flight recovery status, and current load.
 */
export interface EdgeOverviewPoP {
  id: string
  name: string
  zone: string
  planName: string
  status: string
  nodeCount: number
  targetNodeCount: number
  deficit: number
  servingFip?: string
  recovery?: EdgeRecoveryStatus
  nodes: EdgeOverviewNode[]
  autoscaleState?: EdgeAutoscaleState
}

/**
 * GET /admin/edge/overview response: one consolidated, read-only snapshot of
 * the edge fleet for the admin console (the static autoscale policy plus one row
 * per PoP).
 */
export interface EdgeOverview {
  autoscale: EdgeAutoscaleConfig
  pops: EdgeOverviewPoP[]
}

/** Aggregated HA recovery activity for one service kind. */
export interface EdgeRecoveryByKind {
  serviceKind: string
  attempts: number
  errors: number
  avgDurationSeconds: number
}

/** One service's current node deficit. */
export interface EdgeRecoveryDeficit {
  serviceId: string
  deficit: number
}

/** The failed-node reconciler loop counters. */
export interface EdgeReconcilerTicks {
  scanned: number
  candidatesFound: number
  queryFailed: number
}

/**
 * GET /admin/edge/recovery response: a snapshot of the shared HA recovery
 * telemetry read from the in-process metrics gatherer.
 */
export interface EdgeRecovery {
  byKind: EdgeRecoveryByKind[]
  deficitByService: EdgeRecoveryDeficit[]
  reconcilerTicks: EdgeReconcilerTicks
}

/**
 * One app routed through the edge, with the PoP zone it is served from and its
 * measured request rate over the window. `requestsPerSec` is zero for a
 * linked-but-idle app.
 */
export interface EdgeRouteApp {
  serviceId: string
  name: string
  status: string
  zone: string
  requestsPerSec: number
}

/**
 * GET /admin/edge/routes response: the apps currently routed through the edge
 * and their per-PoP request rate, ordered busiest first.
 */
export interface EdgeRoutes {
  windowMinutes: number
  apps: EdgeRouteApp[]
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
  /** Empty for keys minted from a custom inlinePolicy. */
  prefix: string
  /** 'read' | 'write' | 'readwrite' | 'custom' ('custom' when scoped by inlinePolicy) */
  permissions: string
  /** The custom policy the key was minted with, when created from a statement
   * list rather than the prefix + permission shorthand. Absent for shorthand keys. */
  inlinePolicy?: FilesKeyPolicy
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

/**
 * One statement of a custom inline access-key policy. The client controls the
 * effect, actions, and prefixes; the platform always scopes resource ARNs to
 * the key's own bucket, so a statement can never reach another tenant's data.
 */
export interface FilesPolicyStatement {
  /** 'Allow' | 'Deny' */
  effect: string
  /** S3 data-plane actions, e.g. 's3:GetObject', 's3:PutObject', 's3:ListBucket'. */
  actions: string[]
  /** Object key prefixes within the bucket this statement applies to. Empty = whole bucket. */
  prefixes?: string[]
}

/** A custom inline policy: statements compiled into a bucket-scoped IAM document. */
export interface FilesKeyPolicy {
  statements: FilesPolicyStatement[]
}

/**
 * Body for minting a new access key. Scope it with either the prefix +
 * permissions shorthand or a custom `policy` (mutually exclusive).
 */
export interface CreateFilesAccessKeyRequest {
  name: string
  /** Ignored when `policy` is set. */
  prefix?: string
  /** 'read' | 'write' | 'readwrite'. Required unless `policy` is set. */
  permissions?: string
  /** Custom inline policy; mutually exclusive with prefix + permissions. */
  policy?: FilesKeyPolicy
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
  /** Common prefixes ("folders") under the current prefix, present when the
   * request used a delimiter. Each ends with the delimiter. */
  prefixes?: string[]
  nextCursor?: string
}

/** One time-bucketed sample of a bucket's storage footprint. */
export interface FilesUsagePoint {
  timestamp: string
  bytes: number
  objects: number
}

/** Point-in-time storage footprint of a files service. */
export interface FilesUsageCurrent {
  bytes: number
  objects: number
  measuredAt?: string
  /** True when the figures came from an on-demand provider read, not the last tick. */
  live: boolean
  monthlyCostEur: number
}

/** Storage-usage payload: the current footprint plus an over-time series. */
export interface FilesUsage {
  current: FilesUsageCurrent
  series: FilesUsagePoint[]
  /** 'hour' | 'day' */
  granularity: string
}

/** Options for a files usage query. All fields optional. */
export interface FilesUsageOptions {
  /** History window, e.g. '30d' or '24h' (default '30d'). */
  range?: string
  /** 'hour' | 'day'; omit to auto-select by window. */
  granularity?: string
  /** Read the current footprint on demand from the provider instead of the last tick. */
  live?: boolean
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
  /**
   * The single inference service this key may call, or absent for an
   * org-scoped key usable against any of the organization's inference
   * services.
   */
  serviceId?: string
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
  /**
   * States when the secret starts working at the inference endpoint. The key
   * hash reaches the data plane through an edge config reconcile that the mint
   * requests immediately, so a request sent in the same breath as the mint can
   * still answer `invalid_key` and should be retried shortly. It is advisory
   * text rather than a status field, because the control plane cannot confirm
   * per-node application at mint time.
   */
  activationNote: string
}

/** Body for minting a new data-plane key. */
export interface CreateInferenceKeyRequest {
  name: string
  monthlyTokenLimit: number
  rateLimitRpm?: number
  /**
   * Scopes the key to one inference service the organization owns, so the
   * credential reaches that endpoint and no other. Omitted mints an org-scoped
   * key usable against any of the organization's inference services.
   */
  serviceId?: string
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

/**
 * An organization's monthly free token allowance for platform-served
 * (`foundrydb_managed`) inference, as it stands now. Tokens inside the
 * allowance are metered exactly like paid tokens but recorded at zero cost, so
 * the allowance is consumed before any billing starts.
 *
 * Only platform-served token calls draw on it. A call to the organization's own
 * third-party provider is billed on that provider's account and costs the
 * platform nothing, and an image generation is priced per image and reports no
 * tokens, so neither consumes the allowance.
 */
export interface OrgInferenceFreeTierStatus {
  /**
   * First instant of the calendar month this standing describes. The allowance
   * resets at each month boundary.
   */
  cycleMonth: string
  /**
   * The allowance for the month: the platform default unless an administrator
   * set an override for this organization.
   */
  monthlyTokens: number
  /** Allowance tokens drawn down so far this month. */
  tokensUsed: number
  /** Allowance tokens left this month. */
  tokensRemaining: number
}

/** Aggregated inference usage for an organization. */
export interface InferenceUsageSummary {
  from: string
  to: string
  groupBy: string
  rows: InferenceUsageRow[]
  /**
   * The organization's free allowance standing. It always describes the current
   * calendar month regardless of the queried window, because the allowance is a
   * monthly meter and not an aggregate of the window. Absent when the standing
   * could not be read; the rows still answer.
   */
  freeTier?: OrgInferenceFreeTierStatus
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

/**
 * One platform AI surface's provider chain override. While it exists, that
 * surface resolves through `providerChain` instead of the org-level chain.
 */
export interface InferenceChainOverride {
  organizationId?: string
  /** 'chat' | 'advisor' | 'embedding' | 'agent' | 'explainer' */
  surface: string
  providerChain: string[]
  createdAt?: string
  updatedAt?: string
}

/**
 * The organization's provider chain configuration: the ordered chain, whether
 * every provider in it routes EU-resident, and the per-surface overrides
 * currently in place.
 */
export interface InferenceProviderChainInfo {
  providerChain: string[]
  fullyEuResident: boolean
  overrides: InferenceChainOverride[]
}

/**
 * Body for replacing a provider chain. Each entry is a provider identifier
 * (`openai`, `anthropic`, `mistral`, `azure_openai`, `groq`,
 * `foundrydb_managed`); the literal terminator `none` may close the chain to
 * state that resolution stops there with no implicit platform fallback.
 */
export interface SetInferenceProviderChainRequest {
  providerChain: string[]
}

// ---- Managed inference service types ----

/**
 * Selects how an inference service is placed.
 *
 * `dedicated` rents a whole-card GPU server for the tenant and bills per
 * GPU-hour; it requires a GPU plan. `serverless` binds the service to a
 * platform-owned shared pool and bills per token; it takes no plan.
 */
export type InferenceSku = 'dedicated' | 'serverless'

/**
 * Selects how a model's weights are obtained. `curated` is a blessed catalog
 * model the platform has license-verified; `huggingface` is an on-demand pull
 * by Hugging Face repo id, where the customer owns the license.
 */
export type InferenceModelSource = 'curated' | 'huggingface'

/**
 * Model selection and vLLM serving knobs for an inference service. For a
 * curated model the platform resolves the repository, served name, and context
 * length from the catalog. For a Hugging Face model, `modelId` is the org/name
 * repo id and `servedModelName` is required.
 */
export interface InferenceConfig {
  /**
   * The catalog id for a curated model, or the Hugging Face repo id
   * (`org/name`) for an on-demand pull.
   */
  modelId: string
  modelSource: InferenceModelSource
  /**
   * The name the OpenAI-compatible endpoint reports and clients pass as the
   * `model` field. Required for a Hugging Face model.
   */
  servedModelName?: string
  /**
   * The Hugging Face repository vLLM loads the weights from. Resolved by the
   * platform for curated models.
   */
  hfRepo?: string
  /**
   * Authenticates pulls of gated repositories. Write-only: it is accepted on
   * create and never returned by any response.
   */
  hfToken?: string
  /** vLLM weight dtype (`auto`, `bfloat16`, `float16`). Absent means `auto`. */
  dtype?: string
  /**
   * Caps the served context length. Absent or zero uses the catalog default
   * (curated) or the model-derived maximum (Hugging Face).
   */
  maxModelLen?: number
  /**
   * The fraction of VRAM vLLM reserves for the KV cache. Absent or zero uses
   * the platform default (0.90).
   */
  gpuMemoryUtilization?: number
  /**
   * Splits the model across N cards. Absent or zero uses 1; values above 1
   * require a multi-card GPU plan and must divide the plan's card count.
   */
  tensorParallelSize?: number
  /**
   * The format the weights are served at for a Hugging Face model (`''` native,
   * or `'fp8'`), shrinking the footprint so a larger model fits a smaller card.
   * A curated model owns its quantization from the catalog and a request that
   * sets this on one is refused.
   */
  quantization?: string
  /**
   * vLLM KV-cache quantization (`fp8`). Read-only: it is catalog-owned and
   * never accepted from a create request.
   */
  kvCacheDtype?: string
  /**
   * Records that the license was accepted. Required before serving a
   * conditional-commercial curated model or any Hugging Face model.
   */
  licenseAccepted?: boolean
  /**
   * Starts vLLM with LoRA adapter serving enabled so promoted adapters hot-load
   * with no restart. Off by default, and a dedicated-only option: serverless
   * refuses it.
   */
  enableFineTunedServing?: boolean
  /** Bounds the concurrently-loaded adapters. Zero uses the platform default. */
  maxLoras?: number
  /** Bounds the adapter rank. Zero uses the platform default. */
  maxLoraRank?: number
  /**
   * Auto-stops the service after this many minutes with no inference activity,
   * ending the GPU-hour meter until it is started again (the weights stay on the
   * data disk, so the restart is warm). Zero, the default, never auto-stops; any
   * other value must be between 5 and 10080. Dedicated-only: serverless has no
   * customer GPU to park, so it must be 0.
   */
  keepWarmMinutes?: number
}

/**
 * A managed inference service: an open-weight LLM served by vLLM, on a
 * whole-card GPU server (`inferenceSku` `dedicated`) or on a platform-owned
 * shared pool (`inferenceSku` `serverless`). The `inferenceConfig` carries the
 * resolved model configuration; its write-only `hfToken` is never returned.
 */
export interface InferenceService {
  id: string
  userId: string
  organizationId?: string
  name: string
  serviceKind: string
  status: string
  zone: string
  inferenceSku?: InferenceSku
  planName: string
  storageSizeGb?: number
  storageTier?: string
  nodeCount: number
  inferenceConfig?: InferenceConfig
  tlsEnabled: boolean
  errorMessage?: string
  createdAt: string
  updatedAt: string
  /**
   * The service's own edge endpoint host, once provisioned. Absent until the
   * endpoint is minted.
   */
  endpointHostname?: string
  /**
   * The complete OpenAI-compatible base URL to point an SDK at, so no client
   * has to assemble a scheme, a host, and a `/v1` suffix of its own. It is
   * `https://<endpointHostname>/v1` once the hostname is minted, and is always
   * a platform address: it is never the upstream the platform forwards to,
   * which is internal and not customer-reachable. Call it with an `fdb-inf` key
   * and the model `foundrydb_managed/<servedModelName>`.
   */
  endpointBaseUrl?: string
  /**
   * The newest live provisioning heartbeat while a deploy is in flight (weight
   * download progress, server start, the readiness wait). Absent once the
   * service is Running or has terminally failed, so it is worth surfacing only
   * while polling a create. Returned by `getService` only.
   */
  provisioningMessage?: string
}

/**
 * Body for creating an inference service. Omit `planName` (or set
 * `inferenceSku` to `serverless`) to bind to the platform shared pool. A GPU
 * `planName` creates a dedicated whole-card GPU service.
 */
export interface InferenceServiceRequest {
  name: string
  /**
   * Absent is inferred from `planName`: a GPU plan is dedicated, no plan is
   * serverless. Combining `serverless` with a GPU plan, or `dedicated` with no
   * plan, is refused.
   */
  inferenceSku?: InferenceSku
  planName?: string
  zone?: string
  inferenceConfig: InferenceConfig
  organizationId?: string
}

/** Envelope for the inference services listing. */
export interface ListInferenceServicesResponse {
  inferenceServices: InferenceService[]
}

/**
 * What a published model rate charges per. `tokens` prices per token, carried
 * in the two per-1K figures. `image` prices per generated image, carried in
 * `imageMicrocentsPerUnit`, and the token figures are zero there.
 */
export type InferenceModelRateUnit = 'tokens' | 'image'

/**
 * One curated model's published price as it stands right now, the rate a
 * serverless call on that model is metered at.
 *
 * The two per-1K field names keep the wire spelling of their trailing `1k`
 * segment, which carries no case to convert.
 */
export interface InferenceModelRate {
  /**
   * The curated catalog id, the same id a create request carries in
   * `InferenceConfig.modelId`.
   */
  modelId: string
  /** An absent value reads as tokens. */
  rateUnit: InferenceModelRateUnit
  /**
   * Prices the tokens sent to the model, in microcents per one thousand tokens.
   * Divide by 100,000 for the currency amount per one million tokens. Zero on an
   * image-priced rate.
   */
  promptMicrocentsPer_1k: number
  /**
   * Prices the tokens generated by the model, in microcents per one thousand
   * tokens. Zero on an image-priced rate.
   */
  completionMicrocentsPer_1k: number
  /**
   * Prices one generated image. Divide by 100,000,000 for the currency amount
   * per image. Absent on a token-priced rate.
   */
  imageMicrocentsPerUnit?: number
  /**
   * When this rate took effect, so a quote can date itself and a cached listing
   * can tell one rate from its successor.
   */
  effectiveFrom: string
}

/** Envelope for the model rate card listing. */
export interface ListInferenceModelRatesResponse {
  models: InferenceModelRate[]
}

/** The surface a serverless model answers on. */
export type ServerlessModelCapability = 'chat' | 'embeddings' | 'rerank' | 'image'

/**
 * One curated model a shared pool can answer for right now, and so one a
 * serverless create can bind to. It describes the model, never the pool: pool
 * ids, node counts, and serving URLs are not customer surface.
 */
export interface ServerlessInferenceModel {
  /** The catalog id a create request carries in `InferenceConfig.modelId`. */
  modelId: string
  displayName: string
  /**
   * The surface the model answers on, so a picker can group and label its
   * options.
   */
  capability: ServerlessModelCapability
  /**
   * Always true on a listed model: a model with no serving pool is omitted
   * rather than listed as unavailable. The field is explicit so no client has to
   * infer availability from the listing's mere existence.
   */
  serving: boolean
  /**
   * Marks a model whose weights are end of life upstream. It is still listed and
   * still bindable, because a pool serves it and the customers already on it
   * must keep working; treat it as retiring and do not make it a default choice.
   */
  deprecated: boolean
}

/** Envelope for the serverless model listing. */
export interface ListServerlessInferenceModelsResponse {
  models: ServerlessInferenceModel[]
}

/**
 * Body for switching the model an inference service serves. The target is named
 * by curated catalog id only: a Hugging Face source is not a switch target, and
 * no other property of the service can be changed through it.
 */
export interface InferenceModelSwitchRequest {
  /**
   * The curated catalog id to switch to. It must differ from the model the
   * service serves today and must fit the VRAM of the plan the service already
   * runs on.
   */
  modelId: string
  /**
   * Accepts the target model's license. Required to be true when the target is a
   * license-gated curated model, the same acceptance a create of that model
   * demands. Ungated targets ignore it.
   */
  licenseAccepted?: boolean
}

/**
 * The term of the fit equation that broke the plan's memory budget. `weights`
 * means the weights alone exceed the budget, so no context length makes the
 * configuration fit; `kv_cache` means the weights fit but the requested context
 * length does not; `fits` is reported when the configuration fits.
 */
export type InferenceFitLimitingFactor = 'weights' | 'kv_cache' | 'fits'

/**
 * The shape of a proposed fix for a configuration that does not fit.
 * `reduce_context` serves a shorter context on the same plan; `fp8_kv_cache`
 * halves the KV cache instead of shortening the context; `larger_plan` moves to
 * a bigger GPU plan.
 */
export type InferenceFitSuggestionKind = 'reduce_context' | 'fp8_kv_cache' | 'larger_plan'

/**
 * Body for the VRAM fit preflight: a model, optionally some serving knobs, and
 * the GPU plan to test it against. Every optional field defaults exactly as a
 * create would default it, so leaving them absent asks about the configuration a
 * plain create produces.
 */
export interface InferenceFitCheckRequest {
  modelSource: InferenceModelSource
  /**
   * The curated catalog id, or the Hugging Face repo id (`org/name`) whose
   * config is fetched to size the model.
   */
  modelId: string
  /** The GPU plan alias to test the model against. */
  planName: string
  /**
   * The context length to size the KV cache at. Absent uses the catalog default
   * (curated) or the model-derived maximum (Hugging Face).
   */
  maxModelLen?: number
  /**
   * The format the weights are served at (for example `fp8`, `awq`). Absent uses
   * the checkpoint's own format.
   */
  quantization?: string
  /** `auto` (the model dtype) or `fp8`, which halves the cache. */
  kvCacheDtype?: string
  /**
   * The fraction of the plan's VRAM the budget is drawn from, between 0.10 and
   * 0.99. Absent uses the platform default (0.90).
   */
  gpuMemoryUtilization?: number
}

/**
 * One concrete way to make a refused configuration fit. Suggestions are only
 * offered when they would actually work, so a weights-limited refusal never
 * proposes trimming the context.
 */
export interface InferenceFitSuggestion {
  kind: InferenceFitSuggestionKind
  /** States the fix in caller language and is safe to show verbatim. */
  detail: string
  /** The plan to move to. Set on `larger_plan` only. */
  planName?: string
  /** The context length that would fit. Set on `reduce_context` only. */
  maxModelLen?: number
}

/**
 * The verdict of the VRAM fit preflight, the memory breakdown it was reached
 * from, and the closest fixes when it is a refusal. All sizes are gibibytes of
 * VRAM.
 */
export interface InferenceFitCheckResult {
  /**
   * Whether weights, KV cache, and overhead together stay within `budgetGb`.
   */
  fits: boolean
  /** The model weights at the resolved dtype and quantization. */
  weightsGb: number
  /** The KV cache at the resolved context length and cache dtype. */
  kvCacheGb: number
  /**
   * The fixed serving allowance (CUDA context, activations, the vLLM runtime).
   * It does not vary with context length.
   */
  overheadGb: number
  /** `planVramGb` times the effective memory utilization. */
  budgetGb: number
  /** The plan's total VRAM, before the utilization budget. */
  planVramGb: number
  /**
   * The largest `maxModelLen` this plan would serve this model at. Zero when the
   * weights alone exceed the budget.
   */
  maxContextThatFits: number
  limitingFactor: InferenceFitLimitingFactor
  /**
   * The closest fixes, most relevant first. Empty when the configuration already
   * fits.
   */
  suggestions: InferenceFitSuggestion[]
}

/** Usage counters rolled up across every bucket in the requested window. */
export interface InferenceServiceUsageTotals {
  calls: number
  errors: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costMicrocents: number
  /**
   * How many images the calls generated. It stays zero for a text model, which
   * produces none; an image model meters images rather than output tokens, so it
   * is the only usage figure that moves there.
   */
  images: number
  avgLatencyMs: number
  /**
   * The 95th percentile latency across the window, the tail the slowest callers
   * actually wait for. It is computed over the metered calls rather than folded
   * up from the series, because a percentile is not summable. Zero when the
   * window metered no calls.
   */
  p95LatencyMs: number
  /** `errors / calls`, 0 when there are no calls. */
  errorRate: number
}

/** One time bucket of usage. Empty buckets are omitted from the series. */
export interface InferenceServiceUsagePoint {
  bucketStart: string
  calls: number
  errors: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costMicrocents: number
  /** How many images the calls in this bucket generated; zero for a text model. */
  images: number
  avgLatencyMs: number
  /** The 95th percentile latency within this bucket. */
  p95LatencyMs: number
}

/**
 * The accrued GPU-hour spend for a dedicated inference service over the usage
 * window, in EUR. `costEur` is the summed spend, approximately
 * `hourlyRateEur * billedHours`.
 */
export interface InferenceServiceGpuHourCost {
  /** The number of hourly billing snapshots counted. */
  billedHours: number
  /** The most recent hourly rate. */
  hourlyRateEur: number
  costEur: number
}

/**
 * One service's calendar-month-to-date rollup, independent of the window the
 * caller asked for. Both charges sit on it so a client does not issue a second
 * request per range change.
 */
export interface InferenceServiceUsageMonthToDate {
  /**
   * The accounting window start actually used: the first instant of the current
   * UTC month, or the service's creation time when it is younger than the month,
   * so a two-day-old service never claims a full month.
   */
  from: string
  /**
   * The metered per-token usage over that window, the charge for a serverless
   * service.
   */
  tokens: InferenceServiceUsageTotals
  /**
   * The GPU-hour spend over that window, the charge for a dedicated service.
   * Absent when billing has recorded no hour for it this month.
   */
  gpuHour?: InferenceServiceGpuHourCost
}

/**
 * A service's metered usage over a window: rolled-up totals plus the ordered
 * bucket series. Usage is attributed to the service's dedicated endpoint within
 * the owning organization, so two services serving the same model never share
 * each other's usage, and the window never starts before the service was
 * created.
 */
export interface InferenceServiceUsage {
  serviceId: string
  from: string
  to: string
  bucketSeconds: number
  totals: InferenceServiceUsageTotals
  series: InferenceServiceUsagePoint[]
  /**
   * The real GPU-hour spend for a dedicated inference service, summed from the
   * billing snapshots that charge it. A dedicated endpoint bills per GPU-hour
   * while running, not per token, so this is the actual cost while
   * `totals.costMicrocents` (per token) stays 0 for an in-house model. Absent
   * when billing has not yet recorded an hour for the service.
   */
  gpuHour?: InferenceServiceGpuHourCost
  /**
   * The calendar-month rollup, which is what a bill is settled on and which the
   * charted window (24 hours by default) cannot answer. It is unaffected by the
   * requested window.
   */
  monthToDate?: InferenceServiceUsageMonthToDate
}

/**
 * A single GPU's hardware telemetry sampled from `nvidia-smi` on the inference
 * node. Memory is in mebibytes and power in watts.
 */
export interface InferenceGpuStats {
  index: number
  utilPercent: number
  memUsedMb: number
  memTotalMb: number
  tempC: number
  powerW: number
}

/**
 * One sampled reading of a GPU inference node's live serving telemetry: the
 * vLLM OpenAI server's own Prometheus metrics plus the node's GPU hardware
 * counters. Token throughput and the average-latency fields are interval rates
 * derived on the node from the delta between two consecutive scrapes; the first
 * scrape after start reports zero for those derived fields.
 */
export interface InferenceServerMetricsSnapshot {
  /** When the agent took this reading (UTC). */
  collectedAt: string
  /** The served model label vLLM reports on its metrics. */
  modelName?: string
  /**
   * False when the vLLM `/metrics` endpoint could not be scraped this tick
   * (still starting, crash-looping, or draining). The GPU fields may still be
   * present in that case.
   */
  serverReachable: boolean
  requestsRunning: number
  requestsWaiting: number
  /** Fraction (0 to 1) of KV cache blocks in use. */
  gpuCacheUsagePerc: number
  generationTokensPerSec: number
  promptTokensPerSec: number
  /** Average time to first token over the interval, in milliseconds. */
  avgTtftMs: number
  /** Average inter-token latency over the interval, in milliseconds. */
  avgTpotMs: number
  /** Average end-to-end request latency over the interval, in milliseconds. */
  avgE2eLatencyMs: number
  /** Cumulative successful request count (monotonic; charted as a delta). */
  requestsSuccessTotal: number
  /**
   * One entry per physical GPU visible on the node (`nvidia-smi` order). Absent
   * or empty when `nvidia-smi` is unavailable.
   */
  gpus?: InferenceGpuStats[]
}

/**
 * The live-metrics payload for one inference service: the ordered snapshot
 * series over the requested window plus the most recent snapshot for the
 * realtime tiles. It is the live vLLM and GPU telemetry the inference node
 * samples, distinct from the metered usage and cost.
 */
export interface InferenceServiceMetrics {
  serviceId: string
  from: string
  to: string
  snapshots: InferenceServerMetricsSnapshot[]
  latest?: InferenceServerMetricsSnapshot
}

/**
 * The lifecycle status of a LoRA fine-tuned adapter in the serving registry.
 * `uploaded` means the weights are in Files and the registry row exists but it
 * is not yet loaded onto a GPU; `active` means it is loaded into vLLM and
 * serving; `superseded` means it was replaced by a newer promoted version and is
 * kept so a rollback can re-promote it; `archived` means it is retired and no
 * longer promotable.
 */
export type InferenceAdapterStatus = 'uploaded' | 'active' | 'superseded' | 'archived'

/**
 * One version of a customer LoRA fine-tuned adapter in the serving registry. The
 * adapter is trained on the organization's data and its weights stored in Files
 * (object storage); promoting it downloads the weights onto the base-model GPU,
 * verifies their hash, and hot-loads them into vLLM. Once active, the service
 * answers to the adapter as `foundrydb_managed/<servedModelName>` on the
 * OpenAI-compatible endpoint. An adapter never leaves its owning organization's
 * boundary.
 */
export interface InferenceModelAdapter {
  id: string
  /**
   * The owning organization; an adapter is only servable on that organization's
   * GPU.
   */
  organizationId: string
  /**
   * The service currently serving this adapter. Null while the row is only
   * uploaded and not yet promoted.
   */
  inferenceServiceId?: string | null
  /**
   * The base model the adapter was trained against; promote rejects a mismatch
   * with the service's model.
   */
  baseModelId: string
  /**
   * The customer-facing name the adapter answers to in the OpenAI-wire `model`
   * field (`foundrydb_managed/<servedModelName>`).
   */
  servedModelName: string
  /**
   * Monotonic per organization and served model name. Rollback re-promotes a
   * prior version.
   */
  version: number
  /** Locates the adapter artifact in Files. */
  filesBucket: string
  /** Locates the adapter artifact in Files. */
  filesKeyPrefix: string
  /**
   * The hash of the adapter weights, verified after download before loading so a
   * tampered or partial artifact never serves.
   */
  adapterSha256: string
  /**
   * The artifact size, for the vLLM adapter slot and VRAM headroom budget.
   */
  sizeBytes: number
  /**
   * The base-model license that travels with the weights; promote enforces its
   * commercial-use terms. Empty is allowed.
   */
  baseModelLicense?: string
  status: InferenceAdapterStatus
  createdAt: string
  /** Set when the adapter last became active. Null until first promote. */
  promotedAt?: string | null
  deletedAt?: string | null
}

/** Envelope for the adapter listing. */
export interface ListInferenceServiceAdaptersResponse {
  adapters: InferenceModelAdapter[]
}

/** Envelope for a single-adapter response. */
export interface InferenceModelAdapterResponse {
  adapter: InferenceModelAdapter
}

/**
 * Body for recording an uploaded LoRA fine-tuned adapter version in the serving
 * registry. The producer (the fine-tuning workflow) sends it after uploading the
 * adapter artifact to the organization's Files bucket. The owning organization
 * is resolved from the caller's auth, or from `organizationId` when set and the
 * caller is a member of it; it is never trusted from the artifact.
 */
export interface InferenceAdapterRegisterRequest {
  /**
   * Registers the adapter under a specific organization the caller belongs to (a
   * platform admin may target any). Absent uses the caller's active
   * organization.
   */
  organizationId?: string
  /**
   * The base model the adapter was trained against; it must later match the
   * serving service's model id or Hugging Face repo.
   */
  baseModelId: string
  /**
   * The customer-facing name the adapter answers to, becoming
   * `foundrydb_managed/<servedModelName>`. Letters, digits, `.`, `_` and `-`
   * only, at most 128 characters.
   */
  servedModelName: string
  /**
   * Monotonic per (organization, served model name) and must be at least 1.
   */
  version: number
  /** The organization's Files bucket holding the adapter artifact. */
  filesBucket: string
  /**
   * The Files key prefix holding `adapter_model.safetensors` and
   * `adapter_config.json`.
   */
  filesKeyPrefix: string
  /**
   * The 64-character lowercase hex sha256 of `adapter_model.safetensors`,
   * re-verified after download before loading.
   */
  adapterSha256: string
  /** The artifact size in bytes; must not be negative. */
  sizeBytes: number
  /** The base-model license that travels with the weights. Optional. */
  baseModelLicense?: string
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
