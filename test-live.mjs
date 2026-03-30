// Live integration test for the FoundryDB TypeScript SDK
import { FoundryDB } from './dist/index.js'

const BASE_URL = 'https://api.foundrydb.com'
const USERNAME = 'admin'
const PASSWORD = 'admin'

const EXPECTED_SERVICES = [
  { id: '7d7d49fd-bc10-4696-98bf-0e7314897b73', databaseType: 'postgresql' },
  { id: '9fd0b367-a58d-40e1-8a1d-f61a59ca25a8', databaseType: 'mysql' },
  { id: 'f209c068-488e-46ad-b326-b2e938ff91a5', databaseType: 'mongodb' },
  { id: '0f95cca8-8469-4b91-a0f3-7c98dec1520a', databaseType: 'valkey' },
  { id: '0b8a5750-7733-4eb2-aabc-3147b447a1b9', databaseType: 'kafka' },
  { id: 'cd1d7cd1-6be8-457d-9be0-fd3dd8dfebfe', databaseType: 'opensearch' },
  { id: '3149d460-3a45-4f72-8217-02e946d7f5da', databaseType: 'mssql' },
]

let passed = 0
let failed = 0

function pass(label) {
  console.log(`  PASS: ${label}`)
  passed++
}

function fail(label, reason) {
  console.log(`  FAIL: ${label}`)
  if (reason) console.log(`        ${reason}`)
  failed++
}

function section(title) {
  console.log(`\n=== ${title} ===`)
}

const client = new FoundryDB({
  apiUrl: BASE_URL,
  username: USERNAME,
  password: PASSWORD,
})

// ---- Test 1: organizations.list() ----
section('Test 1: organizations.list()')
try {
  const result = await client.organizations.list()
  // SDK returns ListOrganizationsResponse: { organizations: Organization[] }
  if (Array.isArray(result.organizations) && result.organizations.length >= 1) {
    pass(`organizations.list() returned ${result.organizations.length} org(s)`)
    for (const org of result.organizations) {
      if (org.id && org.name) {
        pass(`  Org "${org.name}" (id=${org.id}) has required fields`)
      } else {
        fail(`  Org missing id or name`, JSON.stringify(org))
      }
    }
  } else {
    fail('organizations.list() did not return array with at least 1 org', JSON.stringify(result))
  }
} catch (err) {
  fail('organizations.list() threw an error', err.message)
}

// ---- Test 2: services.list() - verify all 7 IDs present with status Running ----
section('Test 2: services.list() - all 6 services present and Running')
try {
  const result = await client.services.list()
  // SDK returns ListServicesResponse: { services: Service[] }
  if (!Array.isArray(result.services)) {
    fail('services.list() did not return { services: [...] }', JSON.stringify(result))
  } else {
    pass(`services.list() returned ${result.services.length} service(s)`)
    const byId = new Map(result.services.map((s) => [s.id, s]))
    for (const expected of EXPECTED_SERVICES) {
      const svc = byId.get(expected.id)
      if (!svc) {
        fail(`${expected.databaseType} (${expected.id.slice(0, 8)}...) MISSING from list`)
        continue
      }
      const statusLower = typeof svc.status === 'string' ? svc.status.toLowerCase() : svc.status
      if (statusLower !== 'running') {
        fail(`${expected.databaseType} (${expected.id.slice(0, 8)}...) status not Running`, `got "${svc.status}"`)
      } else {
        pass(`${expected.databaseType} (${expected.id.slice(0, 8)}...) present, status="${svc.status}"`)
      }
    }
  }
} catch (err) {
  fail('services.list() threw an error', err.message)
}

// ---- Test 3: services.get(id) for each of the 7 IDs ----
section('Test 3: services.get(id) for each service')
for (const expected of EXPECTED_SERVICES) {
  const label = `services.get(${expected.databaseType}: ${expected.id.slice(0, 8)}...)`
  try {
    const svc = await client.services.get(expected.id)

    if (svc.id !== expected.id) {
      fail(`${label} - id mismatch`, `got ${svc.id}, expected ${expected.id}`)
      continue
    }
    if (svc.databaseType !== expected.databaseType) {
      fail(`${label} - databaseType mismatch`, `got "${svc.databaseType}", expected "${expected.databaseType}"`)
      continue
    }
    const statusLower = typeof svc.status === 'string' ? svc.status.toLowerCase() : svc.status
    if (statusLower !== 'running') {
      fail(`${label} - status not Running`, `got "${svc.status}"`)
      continue
    }
    pass(`${label} - id OK, databaseType OK, status="${svc.status}"`)
  } catch (err) {
    fail(`${label} threw`, err.message)
  }
}

// ---- Summary ----
console.log('\n==============================')
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(failed === 0 ? 'Overall: PASS' : 'Overall: FAIL')
console.log('==============================')

process.exit(failed > 0 ? 1 : 0)
