// Live integration test for the FoundryDB TypeScript SDK
import { FoundryDB } from './dist/index.js'

const BASE_URL = 'https://api.foundrydb.com'
const USERNAME = 'admin'
const PASSWORD = '0BYjYyWhb5MW96LVIXqE'

const EXPECTED_SERVICES = [
  { id: 'a65ea369-7a0d-460f-8289-09bf031ed7fc', databaseType: 'postgresql' },
  { id: '0f535f8e-fe90-4c61-86a6-9291e4153921', databaseType: 'mysql' },
  { id: 'b812422b-1869-4e9c-b698-9fdfcbebf75d', databaseType: 'mongodb' },
  { id: 'c5f66c4f-dee3-49e5-8b77-5356f875043b', databaseType: 'valkey' },
  { id: '190d4aaf-3224-48f9-a144-d4cfe09b45e8', databaseType: 'kafka' },
  { id: 'fd401c8a-97c5-429e-9e9d-bb503e664856', databaseType: 'opensearch' },
  { id: '1ad021f7-a954-44a8-b829-af6501045a3e', databaseType: 'mssql' },
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
section('Test 2: services.list() - all 7 services present and Running')
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
