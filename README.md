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

// Get a service by ID
const svc = await client.services.get(service.id)

// Update a service (e.g. change allowed CIDRs)
await client.services.update(service.id, {
  allowedCidrs: ['203.0.113.0/24'],
})

// Delete a service
await client.services.delete(service.id)
```

Supported `databaseType` values: `postgresql`, `mysql`, `mongodb`, `valkey`, `kafka`

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
} from '@foundrydb/sdk'
```

## CommonJS (require)

The package ships both ESM and CJS outputs:

```javascript
const { FoundryDB } = require('@foundrydb/sdk')
```

## License

MIT
