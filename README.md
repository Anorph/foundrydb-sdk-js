# @foundrydb/sdk

Official JavaScript/TypeScript SDK for the [FoundryDB](https://foundrydb.com) managed database platform.

## Installation

```bash
npm install @foundrydb/sdk
# or
yarn add @foundrydb/sdk
# or
pnpm add @foundrydb/sdk
```

## Requirements

- Node.js 18+ (uses native `fetch` — no axios dependency)
- Works in Deno, Bun, and edge runtimes (Cloudflare Workers, Vercel Edge, etc.)
- TypeScript 5+

## Quick Start

```typescript
import { FoundryDB } from '@foundrydb/sdk'

const client = new FoundryDB({
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'admin',
})

// List all services
const { services } = await client.services.list()
console.log(services)
```

## Usage

### Organizations

```typescript
// List all organizations the current user belongs to
const { organizations } = await client.organizations.list()
console.log(organizations)
// [{ id: 'org_abc', name: 'My Team', slug: 'my-team', isPersonal: false, createdAt: '...' }]

// Get a specific organization
const org = await client.organizations.get('org_abc')
```

You can scope the entire client to an organization so that every service call automatically sends `X-Active-Org-ID`:

```typescript
const client = new FoundryDB({
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'admin',
  organizationId: 'org_abc123',  // applied to all requests
})
```

Or override the organization on a per-call basis:

```typescript
// List services in a specific org (overrides client-level default)
const { services } = await client.services.list({ organizationId: 'org_xyz' })

// Create a service in a specific org
const service = await client.services.create({
  name: 'my-pg',
  databaseType: 'postgresql',
  version: '17',
  planName: 'tier-2',
  zone: 'se-sto1',
  storageSizeGb: 50,
  storageTier: 'maxiops',
  organizationId: 'org_xyz',  // per-request override
})
```

### Services

```typescript
// List all managed services
const { services } = await client.services.list()

// Create a new PostgreSQL service
const service = await client.services.create({
  name: 'my-pg',
  databaseType: 'postgresql',
  version: '17',
  planName: 'tier-2',
  zone: 'se-sto1',
  storageSizeGb: 50,
  storageTier: 'maxiops',
})
console.log('Created:', service.id, service.status)

// Create a multi-node HA PostgreSQL cluster
const haService = await client.services.create({
  name: 'my-pg-ha',
  databaseType: 'postgresql',
  version: '17',
  planName: 'tier-4',
  zone: 'se-sto1',
  storageSizeGb: 100,
  storageTier: 'maxiops',
  nodeCount: 3,
  autoFailoverEnabled: true,
  replicationMode: 'async',
  encryptionEnabled: true,
  allowedCidrs: ['203.0.113.0/24'],
})

// Get a service by ID
const svc = await client.services.get(service.id)

// Update a service (e.g. change allowed CIDRs)
await client.services.update(service.id, {
  allowedCidrs: ['203.0.113.0/24'],
})

// Delete a service
await client.services.delete(service.id)
```

Supported `databaseType` values:

| Type | Versions |
|------|----------|
| `postgresql` | 14, 15, 16, 17, 18 |
| `mysql` | 8.4 |
| `mongodb` | 6.0, 7.0, 8.0 |
| `valkey` | 7.2, 8.0, 8.1, 9.0 |
| `kafka` | 3.6, 3.7, 3.8, 3.9, 4.0 |
| `opensearch: 2 |
| `mssql` | 4.8 |

### Database Users and Credentials

```typescript
// List users
const { users } = await client.users.list(serviceId)

// Reveal password and connection string for a user
const creds = await client.users.revealPassword(serviceId, 'admin')
console.log(creds.connectionString)
// postgresql://admin:s3cret@my-pg.foundrydb.com:5432/defaultdb?sslmode=require
```

### Backups

```typescript
// List backups
const { backups } = await client.backups.list(serviceId)

// Trigger an on-demand backup
await client.backups.trigger(serviceId)
```

### Monitoring

```typescript
// Get current metrics
const metrics = await client.monitoring.getMetrics(serviceId)
console.log(`CPU: ${metrics.cpuUsagePercent}%, Mem: ${metrics.memoryUsagePercent}%`)

// Request and stream logs (low-level)
const { taskId } = await client.monitoring.requestLogs(serviceId, 200)
const result = await client.monitoring.getLogs(serviceId, taskId)
console.log(result.logs)

// Or use the convenience wrapper that polls automatically
const logs = await client.monitoring.fetchLogs(serviceId, { lines: 500 })
console.log(logs)
```

### Edge Gateway

The edge gateway lets you attach custom domains to an app service and tune per-app cache rules, rate limiting, and WAF mode. All methods live on `client.edge`.

```typescript
// Add a custom domain (starts in pending_verification status)
const domain = await client.edge.createAppDomain(app.id, { domain: 'app.example.com' })
console.log(domain.cnameTarget) // point your DNS CNAME here

// Trigger an immediate verification pass (the background worker also runs periodically)
await client.edge.verifyAppDomain(app.id, domain.id)

// List and remove domains
const domains = await client.edge.listAppDomains(app.id)
await client.edge.deleteAppDomain(app.id, domain.id)

// Check edge convergence across PoPs
const status = await client.edge.getAppEdgeStatus(app.id)
console.log(status.edgeEnabled, status.homePop, status.configVersion)
status.applications?.forEach(a => console.log(a.zone, a.status, a.appliedVersion))

// Replace cache rules, rate limiting, and WAF mode
const settings = await client.edge.updateAppEdgeSettings(app.id, {
  cacheRules: [{ pathPrefix: '/static', ttlSeconds: 86400 }],
  rateLimit: { requestsPerSecond: 100, burst: 200, key: 'ip' },
  wafMode: 'detect',
})
console.log(settings.configVersion) // fleet converges on this version
```

### Compliance Evidence Packets

Generate cryptographically signed compliance evidence packets (SOC 2 and GDPR Art. 30 ROPA) for an organization. All methods live on `client.compliance`.

```typescript
// Generate a new SOC 2 compliance report
const report = await client.compliance.generateComplianceReport('org_abc', 'soc2')
console.log(report.reportId)           // persist for re-download
console.log(report.packet.framework)   // 'soc2'
console.log(report.signature.keyId)    // signing key used

// Generate a GDPR Art. 30 Record of Processing Activities report
const ropa = await client.compliance.generateComplianceReport('org_abc', 'gdpr_ropa')

// List all generated compliance reports for an organization
const reports = await client.compliance.listComplianceReports('org_abc')
reports.forEach(r => console.log(r.id, r.framework, r.generatedAt, r.hasPdf))

// Re-download a report as a signed JSON packet
const packet = await client.compliance.downloadComplianceReportJSON('org_abc', report.reportId)
console.log(packet.packet.controls.length)   // number of assessed controls
console.log(packet.signature.canonicalSha256) // hash for independent verification

// Download a PDF version of a report (returns raw bytes)
const pdf = await client.compliance.downloadComplianceReportPDF('org_abc', report.reportId)
// pdf is a Uint8Array — write to disk, attach to an email, etc.
import { writeFileSync } from 'fs'
writeFileSync('compliance-report.pdf', pdf)

// Fetch the platform's public signing keys (no auth required)
// Auditors can call this independently to verify packet signatures
const keys = await client.compliance.complianceSigningKeys()
keys.keys.forEach(k => console.log(k.keyId, k.algorithm, k.active))
```

Supported frameworks:

| Value | Description |
|-------|-------------|
| `soc2` | SOC 2 Type II evidence packet |
| `gdpr_ropa` | GDPR Art. 30 Record of Processing Activities |

## Error Handling

All errors from the API throw a `FoundryDBError` with `statusCode` and `body` properties:

```typescript
import { FoundryDB, FoundryDBError } from '@foundrydb/sdk'

try {
  await client.services.get('non-existent-id')
} catch (err) {
  if (err instanceof FoundryDBError) {
    console.error(`API error ${err.statusCode}: ${err.message}`)
    console.error(err.body) // raw JSON body from the API
  }
}
```

## Configuration

```typescript
const client = new FoundryDB({
  apiUrl: 'https://api.foundrydb.com', // required
  username: 'admin',                    // required
  password: 'admin',                    // required
  timeoutMs: 30000,                     // optional, default 30s
  organizationId: 'org_abc123',         // optional, scopes all requests to this org
})
```

## TypeScript Types

All request and response shapes are fully typed. Import them directly:

```typescript
import type {
  Service,
  CreateServiceRequest,
  DatabaseUser,
  RevealPasswordResponse,
  Backup,
  ServiceMetrics,
  Organization,
  ListOrganizationsResponse,
  ReplicationMode,
  EdgeDomain,
  EdgeDomainStatus,
  EdgeStatus,
  EdgeSettings,
  EdgeSettingsRequest,
  EdgeCacheRule,
  EdgeRateLimit,
} from '@foundrydb/sdk'
```

## CommonJS (require)

The package ships both ESM and CJS outputs:

```javascript
const { FoundryDB } = require('@foundrydb/sdk')
```

## License

MIT
