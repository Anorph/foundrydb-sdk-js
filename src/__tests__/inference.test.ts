import { InferenceAPI } from '../inference'
import { HTTPClient } from '../client'

const BASE_CONFIG = {
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'secret',
}

function makeApi(): InferenceAPI {
  return new InferenceAPI(new HTTPClient(BASE_CONFIG))
}

function mockFetch(body: unknown, status = 200): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'mock',
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  })
  globalThis.fetch = fetchMock
  return fetchMock
}

const MOCK_CHAIN_RAW = {
  provider_chain: ['foundrydb_managed', 'openai', 'none'],
  fully_eu_resident: false,
  overrides: [
    {
      organization_id: 'org_1',
      surface: 'chat',
      provider_chain: ['foundrydb_managed'],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ],
}

describe('InferenceAPI provider chain', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('GETs the chain and decodes the EU verdict and overrides', async () => {
    const fetchMock = mockFetch(MOCK_CHAIN_RAW)

    const info = await makeApi().getProviderChain('org_1')

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.foundrydb.com/organizations/org_1/inference/chain',
    )
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET')
    expect(info.providerChain).toEqual(['foundrydb_managed', 'openai', 'none'])
    expect(info.fullyEuResident).toBe(false)
    expect(info.overrides).toHaveLength(1)
    expect(info.overrides[0].surface).toBe('chat')
    expect(info.overrides[0].organizationId).toBe('org_1')
    expect(info.overrides[0].providerChain).toEqual(['foundrydb_managed'])
    expect(info.overrides[0].createdAt).toBe('2026-01-01T00:00:00Z')
  })

  it('PUTs a replacement chain as provider_chain', async () => {
    const fetchMock = mockFetch(MOCK_CHAIN_RAW)

    await makeApi().setProviderChain('org_1', ['foundrydb_managed', 'none'])

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.foundrydb.com/organizations/org_1/inference/chain',
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({
      provider_chain: ['foundrydb_managed', 'none'],
    })
  })

  it('PUTs a per-surface override at the escaped surface path', async () => {
    const fetchMock = mockFetch(MOCK_CHAIN_RAW.overrides[0])

    const ov = await makeApi().setSurfaceOverride('org_1', 'chat', ['foundrydb_managed'])

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.foundrydb.com/organizations/org_1/inference/chain/overrides/chat',
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({
      provider_chain: ['foundrydb_managed'],
    })
    expect(ov.surface).toBe('chat')
    expect(ov.providerChain).toEqual(['foundrydb_managed'])
  })

  it('DELETEs a per-surface override', async () => {
    const fetchMock = mockFetch({}, 204)

    await makeApi().deleteSurfaceOverride('org_1', 'embedding')

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.foundrydb.com/organizations/org_1/inference/chain/overrides/embedding',
    )
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
  })
})

describe('InferenceAPI keys and usage deltas', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('mints a service-scoped key and returns the activation note', async () => {
    const fetchMock = mockFetch(
      {
        key: {
          id: 'key_1',
          name: 'app key',
          key_prefix: 'fdb-inf-abc',
          monthly_token_limit: 1000000,
          rate_limit_rpm: 60,
          status: 'active',
          tokens_used_cycle: 0,
          cycle_month: '2026-01-01T00:00:00Z',
          service_id: 'inf_1',
          created_at: '2026-01-01T00:00:00Z',
        },
        secret: 'fdb-inf-abc123',
        activation_note: 'The key reaches the data plane within a few seconds.',
      },
      201,
    )

    const result = await makeApi().createKey('org_1', {
      name: 'app key',
      monthlyTokenLimit: 1000000,
      rateLimitRpm: 60,
      serviceId: 'inf_1',
    })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'app key',
      monthly_token_limit: 1000000,
      rate_limit_rpm: 60,
      service_id: 'inf_1',
    })
    expect(result.key.serviceId).toBe('inf_1')
    expect(result.key.keyPrefix).toBe('fdb-inf-abc')
    expect(result.secret).toBe('fdb-inf-abc123')
    expect(result.activationNote).toBe('The key reaches the data plane within a few seconds.')
  })

  it('decodes the free-tier standing on the usage summary', async () => {
    mockFetch({
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T00:00:00Z',
      group_by: 'model',
      rows: [
        {
          group_key: 'llama-3.1-8b-instruct',
          provider: 'foundrydb_managed',
          calls: 10,
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300,
          cost_microcents: 0,
        },
      ],
      free_tier: {
        cycle_month: '2026-01-01T00:00:00Z',
        monthly_tokens: 1000000,
        tokens_used: 300,
        tokens_remaining: 999700,
      },
    })

    const summary = await makeApi().getUsage('org_1', { groupBy: 'model' })

    expect(summary.groupBy).toBe('model')
    expect(summary.rows[0].groupKey).toBe('llama-3.1-8b-instruct')
    expect(summary.freeTier?.cycleMonth).toBe('2026-01-01T00:00:00Z')
    expect(summary.freeTier?.monthlyTokens).toBe(1000000)
    expect(summary.freeTier?.tokensUsed).toBe(300)
    expect(summary.freeTier?.tokensRemaining).toBe(999700)
  })

  it('leaves freeTier undefined when the standing could not be read', async () => {
    mockFetch({ from: 'a', to: 'b', group_by: 'model', rows: [] })
    const summary = await makeApi().getUsage('org_1')
    expect(summary.freeTier).toBeUndefined()
  })
})
