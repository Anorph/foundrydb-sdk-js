import { InferenceServicesAPI } from '../inference-services'
import { HTTPClient } from '../client'
import type {
  InferenceService,
  InferenceServiceUsage,
  InferenceServiceMetrics,
  InferenceFitCheckResult,
  InferenceModelAdapter,
} from '../types'

const BASE_CONFIG = {
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'secret',
}

function makeApi(): InferenceServicesAPI {
  return new InferenceServicesAPI(new HTTPClient(BASE_CONFIG))
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

const MOCK_SERVICE_RAW = {
  id: 'inf_1',
  user_id: 'usr_1',
  organization_id: 'org_1',
  name: 'my-llm',
  service_kind: 'inference',
  status: 'Running',
  zone: 'se-sto1',
  inference_sku: 'dedicated',
  plan_name: 'gpu-l40s-1',
  storage_size_gb: 200,
  storage_tier: 'maxiops',
  node_count: 1,
  inference_config: {
    model_id: 'llama-3.1-8b-instruct',
    model_source: 'curated',
    served_model_name: 'llama-3.1-8b-instruct',
    hf_repo: 'meta-llama/Llama-3.1-8B-Instruct',
    dtype: 'bfloat16',
    max_model_len: 8192,
    gpu_memory_utilization: 0.9,
    tensor_parallel_size: 1,
    kv_cache_dtype: 'fp8',
    license_accepted: true,
    enable_fine_tuned_serving: true,
    max_loras: 2,
    max_lora_rank: 16,
    keep_warm_minutes: 30,
  },
  tls_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  endpoint_hostname: 'my-llm.inf.foundrydb.com',
  endpoint_base_url: 'https://my-llm.inf.foundrydb.com/v1',
  provisioning_message: 'downloading weights',
}

const MOCK_USAGE_RAW = {
  service_id: 'inf_1',
  from: '2026-01-01T00:00:00Z',
  to: '2026-01-02T00:00:00Z',
  bucket_seconds: 3600,
  totals: {
    calls: 120,
    errors: 3,
    input_tokens: 5000,
    output_tokens: 9000,
    total_tokens: 14000,
    cost_microcents: 4200,
    images: 0,
    avg_latency_ms: 310,
    p95_latency_ms: 880,
    error_rate: 0.025,
  },
  series: [
    {
      bucket_start: '2026-01-01T00:00:00Z',
      calls: 60,
      errors: 1,
      input_tokens: 2500,
      output_tokens: 4500,
      total_tokens: 7000,
      cost_microcents: 2100,
      images: 0,
      avg_latency_ms: 300,
      p95_latency_ms: 850,
    },
  ],
  gpu_hour: { billed_hours: 24, hourly_rate_eur: 1.75, cost_eur: 42 },
  month_to_date: {
    from: '2026-01-01T00:00:00Z',
    tokens: {
      calls: 900,
      errors: 5,
      input_tokens: 40000,
      output_tokens: 70000,
      total_tokens: 110000,
      cost_microcents: 33000,
      images: 0,
      avg_latency_ms: 305,
      p95_latency_ms: 870,
      error_rate: 0.0055,
    },
    gpu_hour: { billed_hours: 48, hourly_rate_eur: 1.75, cost_eur: 84 },
  },
}

const MOCK_SNAPSHOT_RAW = {
  collected_at: '2026-01-02T09:00:00Z',
  model_name: 'llama-3.1-8b-instruct',
  server_reachable: true,
  requests_running: 3,
  requests_waiting: 1,
  gpu_cache_usage_perc: 0.42,
  generation_tokens_per_sec: 180.5,
  prompt_tokens_per_sec: 900.25,
  avg_ttft_ms: 120.5,
  avg_tpot_ms: 18.25,
  avg_e2e_latency_ms: 640.75,
  requests_success_total: 10450,
  gpus: [
    {
      index: 0,
      util_percent: 87.5,
      mem_used_mb: 41000,
      mem_total_mb: 46080,
      temp_c: 64,
      power_w: 290.5,
    },
  ],
}

const MOCK_METRICS_RAW = {
  service_id: 'inf_1',
  from: '2026-01-02T08:30:00Z',
  to: '2026-01-02T09:00:00Z',
  snapshots: [MOCK_SNAPSHOT_RAW],
  latest: MOCK_SNAPSHOT_RAW,
}

const MOCK_ADAPTER_RAW = {
  id: 'ad_1',
  organization_id: 'org_1',
  inference_service_id: 'inf_1',
  base_model_id: 'llama-3.1-8b-instruct',
  served_model_name: 'support-tuned',
  version: 3,
  files_bucket: 'org-1-files',
  files_key_prefix: 'adapters/support-tuned/v3',
  adapter_sha256: 'a'.repeat(64),
  size_bytes: 134217728,
  base_model_license: 'llama-3.1-community',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  promoted_at: '2026-01-02T00:00:00Z',
  deleted_at: null,
}

describe('InferenceServicesAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('list', () => {
    it('GETs /inference-services and unwraps the envelope', async () => {
      const fetchMock = mockFetch({ inference_services: [MOCK_SERVICE_RAW] })

      const services: InferenceService[] = await makeApi().list()

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.foundrydb.com/inference-services')
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET')
      expect(services).toHaveLength(1)
    })

    it('returns an empty array when nothing is provisioned', async () => {
      mockFetch({ inference_services: [] })
      await expect(makeApi().list()).resolves.toEqual([])
    })
  })

  describe('get', () => {
    it('decodes the full wire shape of an InferenceService', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW)

      const svc = await makeApi().get('inf_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1',
      )
      expect(svc).not.toBeNull()
      const s = svc as InferenceService
      expect(s.id).toBe('inf_1')
      expect(s.userId).toBe('usr_1')
      expect(s.organizationId).toBe('org_1')
      expect(s.serviceKind).toBe('inference')
      expect(s.inferenceSku).toBe('dedicated')
      expect(s.planName).toBe('gpu-l40s-1')
      expect(s.storageSizeGb).toBe(200)
      expect(s.storageTier).toBe('maxiops')
      expect(s.nodeCount).toBe(1)
      expect(s.tlsEnabled).toBe(true)
      expect(s.endpointHostname).toBe('my-llm.inf.foundrydb.com')
      expect(s.endpointBaseUrl).toBe('https://my-llm.inf.foundrydb.com/v1')
      expect(s.provisioningMessage).toBe('downloading weights')
      expect(s.createdAt).toBe('2026-01-01T00:00:00Z')

      const cfg = s.inferenceConfig
      expect(cfg).toBeDefined()
      expect(cfg?.modelId).toBe('llama-3.1-8b-instruct')
      expect(cfg?.modelSource).toBe('curated')
      expect(cfg?.servedModelName).toBe('llama-3.1-8b-instruct')
      expect(cfg?.hfRepo).toBe('meta-llama/Llama-3.1-8B-Instruct')
      expect(cfg?.dtype).toBe('bfloat16')
      expect(cfg?.maxModelLen).toBe(8192)
      expect(cfg?.gpuMemoryUtilization).toBe(0.9)
      expect(cfg?.tensorParallelSize).toBe(1)
      expect(cfg?.kvCacheDtype).toBe('fp8')
      expect(cfg?.licenseAccepted).toBe(true)
      expect(cfg?.enableFineTunedServing).toBe(true)
      expect(cfg?.maxLoras).toBe(2)
      expect(cfg?.maxLoraRank).toBe(16)
      expect(cfg?.keepWarmMinutes).toBe(30)
      // The write-only HF token is never returned.
      expect(cfg?.hfToken).toBeUndefined()
    })

    it('returns null on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().get('missing')).resolves.toBeNull()
    })

    it('rethrows non-404 errors', async () => {
      mockFetch({ error: 'boom' }, 500)
      await expect(makeApi().get('inf_1')).rejects.toMatchObject({ statusCode: 500 })
    })
  })

  describe('create', () => {
    it('POSTs /inference-services with a snake_case body', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW, 201)

      await makeApi().create({
        name: 'my-llm',
        inferenceSku: 'dedicated',
        planName: 'gpu-l40s-1',
        zone: 'se-sto1',
        inferenceConfig: {
          modelId: 'llama-3.1-8b-instruct',
          modelSource: 'curated',
          servedModelName: 'llama-3.1-8b-instruct',
          hfToken: 'hf_secret',
          maxModelLen: 8192,
          gpuMemoryUtilization: 0.9,
          tensorParallelSize: 1,
          licenseAccepted: true,
          enableFineTunedServing: true,
          maxLoras: 2,
          maxLoraRank: 16,
          keepWarmMinutes: 30,
        },
      })

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.foundrydb.com/inference-services')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({
        name: 'my-llm',
        inference_sku: 'dedicated',
        plan_name: 'gpu-l40s-1',
        zone: 'se-sto1',
        inference_config: {
          model_id: 'llama-3.1-8b-instruct',
          model_source: 'curated',
          served_model_name: 'llama-3.1-8b-instruct',
          hf_token: 'hf_secret',
          max_model_len: 8192,
          gpu_memory_utilization: 0.9,
          tensor_parallel_size: 1,
          license_accepted: true,
          enable_fine_tuned_serving: true,
          max_loras: 2,
          max_lora_rank: 16,
          keep_warm_minutes: 30,
        },
      })
    })
  })

  describe('createServerless', () => {
    it('sends the serverless SKU, a curated model, and no plan', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW, 201)

      await makeApi().createServerless('cheap-llm', 'llama-3.1-8b-instruct', 'org_1', true)

      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(JSON.parse(init.body as string)).toEqual({
        name: 'cheap-llm',
        inference_sku: 'serverless',
        organization_id: 'org_1',
        inference_config: {
          model_id: 'llama-3.1-8b-instruct',
          model_source: 'curated',
          license_accepted: true,
        },
      })
    })

    it('omits the organization when none is given', async () => {
      const fetchMock = mockFetch(MOCK_SERVICE_RAW, 201)

      await makeApi().createServerless('cheap-llm', 'llama-3.1-8b-instruct')

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(body.organization_id).toBeUndefined()
      expect(body.plan_name).toBeUndefined()
      expect(body.inference_config.license_accepted).toBe(false)
    })
  })

  describe('delete', () => {
    it('DELETEs the service', async () => {
      const fetchMock = mockFetch({}, 202)
      await makeApi().delete('inf_1')
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
    })

    it('treats a 404 as an idempotent success', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().delete('gone')).resolves.toBeUndefined()
    })

    it('rethrows other failures', async () => {
      mockFetch({ error: 'busy' }, 409)
      await expect(makeApi().delete('inf_1')).rejects.toMatchObject({ statusCode: 409 })
    })
  })

  describe('listModelRates', () => {
    it('decodes both the token and image rate shapes', async () => {
      const fetchMock = mockFetch({
        models: [
          {
            model_id: 'llama-3.1-8b-instruct',
            rate_unit: 'tokens',
            prompt_microcents_per_1k: 1200,
            completion_microcents_per_1k: 3600,
            effective_from: '2026-01-01T00:00:00Z',
          },
          {
            model_id: 'flux-schnell',
            rate_unit: 'image',
            prompt_microcents_per_1k: 0,
            completion_microcents_per_1k: 0,
            image_microcents_per_unit: 250000,
            effective_from: '2026-01-01T00:00:00Z',
          },
        ],
      })

      const rates = await makeApi().listModelRates()

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/model-rates',
      )
      expect(rates).toHaveLength(2)
      expect(rates[0].modelId).toBe('llama-3.1-8b-instruct')
      expect(rates[0].rateUnit).toBe('tokens')
      expect(rates[0].promptMicrocentsPer_1k).toBe(1200)
      expect(rates[0].completionMicrocentsPer_1k).toBe(3600)
      expect(rates[0].imageMicrocentsPerUnit).toBeUndefined()
      expect(rates[1].rateUnit).toBe('image')
      expect(rates[1].imageMicrocentsPerUnit).toBe(250000)
      expect(rates[1].effectiveFrom).toBe('2026-01-01T00:00:00Z')
    })

    it('returns an empty array when nothing is priced yet', async () => {
      mockFetch({ models: [] })
      await expect(makeApi().listModelRates()).resolves.toEqual([])
    })
  })

  describe('listServerlessModels', () => {
    it('GETs the serverless catalog and decodes it', async () => {
      const fetchMock = mockFetch({
        models: [
          {
            model_id: 'llama-3.1-8b-instruct',
            display_name: 'Llama 3.1 8B Instruct',
            capability: 'chat',
            serving: true,
            deprecated: false,
          },
        ],
      })

      const models = await makeApi().listServerlessModels()

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/serverless-models',
      )
      expect(models[0].modelId).toBe('llama-3.1-8b-instruct')
      expect(models[0].displayName).toBe('Llama 3.1 8B Instruct')
      expect(models[0].capability).toBe('chat')
      expect(models[0].serving).toBe(true)
      expect(models[0].deprecated).toBe(false)
    })
  })

  describe('switchModel', () => {
    it('POSTs to the switch-model path with a snake_case body', async () => {
      const fetchMock = mockFetch({ ...MOCK_SERVICE_RAW, status: 'SwitchingModel' })

      const svc = await makeApi().switchModel('inf_1', {
        modelId: 'mistral-7b-instruct',
        licenseAccepted: true,
      })

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/switch-model',
      )
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({
        model_id: 'mistral-7b-instruct',
        license_accepted: true,
      })
      expect(svc.status).toBe('SwitchingModel')
    })
  })

  describe('checkFit', () => {
    it('POSTs to fit-check and decodes the verdict and suggestions', async () => {
      const fetchMock = mockFetch({
        fits: false,
        weights_gb: 16.2,
        kv_cache_gb: 12.4,
        overhead_gb: 2.5,
        budget_gb: 21.6,
        plan_vram_gb: 24,
        max_context_that_fits: 4096,
        limiting_factor: 'kv_cache',
        suggestions: [
          { kind: 'reduce_context', detail: 'Serve 4096 tokens instead', max_model_len: 4096 },
          { kind: 'larger_plan', detail: 'Move to gpu-l40s-1', plan_name: 'gpu-l40s-1' },
        ],
      })

      const result: InferenceFitCheckResult = await makeApi().checkFit({
        modelSource: 'huggingface',
        modelId: 'mistralai/Mistral-7B-Instruct-v0.3',
        planName: 'gpu-l4-1',
        maxModelLen: 32768,
        kvCacheDtype: 'fp8',
        gpuMemoryUtilization: 0.9,
      })

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/fit-check',
      )
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({
        model_source: 'huggingface',
        model_id: 'mistralai/Mistral-7B-Instruct-v0.3',
        plan_name: 'gpu-l4-1',
        max_model_len: 32768,
        kv_cache_dtype: 'fp8',
        gpu_memory_utilization: 0.9,
      })

      expect(result.fits).toBe(false)
      expect(result.weightsGb).toBe(16.2)
      expect(result.kvCacheGb).toBe(12.4)
      expect(result.overheadGb).toBe(2.5)
      expect(result.budgetGb).toBe(21.6)
      expect(result.planVramGb).toBe(24)
      expect(result.maxContextThatFits).toBe(4096)
      expect(result.limitingFactor).toBe('kv_cache')
      expect(result.suggestions[0].kind).toBe('reduce_context')
      expect(result.suggestions[0].maxModelLen).toBe(4096)
      expect(result.suggestions[1].planName).toBe('gpu-l40s-1')
    })
  })

  describe('getUsage', () => {
    it('decodes the totals, series, GPU-hour cost, and month-to-date rollup', async () => {
      const fetchMock = mockFetch(MOCK_USAGE_RAW)

      const usage = await makeApi().getUsage('inf_1', '24h')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/usage?since=24h',
      )
      expect(usage).not.toBeNull()
      const u = usage as InferenceServiceUsage
      expect(u.serviceId).toBe('inf_1')
      expect(u.bucketSeconds).toBe(3600)
      expect(u.totals.inputTokens).toBe(5000)
      expect(u.totals.outputTokens).toBe(9000)
      expect(u.totals.totalTokens).toBe(14000)
      expect(u.totals.costMicrocents).toBe(4200)
      expect(u.totals.images).toBe(0)
      expect(u.totals.avgLatencyMs).toBe(310)
      expect(u.totals.p95LatencyMs).toBe(880)
      expect(u.totals.errorRate).toBe(0.025)
      expect(u.series).toHaveLength(1)
      expect(u.series[0].bucketStart).toBe('2026-01-01T00:00:00Z')
      expect(u.series[0].p95LatencyMs).toBe(850)
      expect(u.gpuHour?.billedHours).toBe(24)
      expect(u.gpuHour?.hourlyRateEur).toBe(1.75)
      expect(u.gpuHour?.costEur).toBe(42)
      expect(u.monthToDate?.from).toBe('2026-01-01T00:00:00Z')
      expect(u.monthToDate?.tokens.totalTokens).toBe(110000)
      expect(u.monthToDate?.gpuHour?.costEur).toBe(84)
    })

    it('omits the since parameter when not given', async () => {
      const fetchMock = mockFetch(MOCK_USAGE_RAW)
      await makeApi().getUsage('inf_1')
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/usage',
      )
    })

    it('returns null on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().getUsage('missing')).resolves.toBeNull()
    })
  })

  describe('getMetrics', () => {
    it('decodes the snapshot series, latest snapshot, and GPU telemetry', async () => {
      const fetchMock = mockFetch(MOCK_METRICS_RAW)

      const metrics = await makeApi().getMetrics('inf_1', '30m')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/metrics?since=30m',
      )
      expect(metrics).not.toBeNull()
      const m = metrics as InferenceServiceMetrics
      expect(m.serviceId).toBe('inf_1')
      expect(m.snapshots).toHaveLength(1)

      const latest = m.latest
      expect(latest).toBeDefined()
      expect(latest?.collectedAt).toBe('2026-01-02T09:00:00Z')
      expect(latest?.modelName).toBe('llama-3.1-8b-instruct')
      expect(latest?.serverReachable).toBe(true)
      expect(latest?.requestsRunning).toBe(3)
      expect(latest?.requestsWaiting).toBe(1)
      expect(latest?.gpuCacheUsagePerc).toBe(0.42)
      expect(latest?.generationTokensPerSec).toBe(180.5)
      expect(latest?.promptTokensPerSec).toBe(900.25)
      expect(latest?.avgTtftMs).toBe(120.5)
      expect(latest?.avgTpotMs).toBe(18.25)
      expect(latest?.avgE2eLatencyMs).toBe(640.75)
      expect(latest?.requestsSuccessTotal).toBe(10450)

      const gpu = latest?.gpus?.[0]
      expect(gpu?.index).toBe(0)
      expect(gpu?.utilPercent).toBe(87.5)
      expect(gpu?.memUsedMb).toBe(41000)
      expect(gpu?.memTotalMb).toBe(46080)
      expect(gpu?.tempC).toBe(64)
      expect(gpu?.powerW).toBe(290.5)
    })

    it('returns null on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().getMetrics('missing')).resolves.toBeNull()
    })
  })

  describe('adapters', () => {
    it('lists adapters and decodes the registry row', async () => {
      const fetchMock = mockFetch({ adapters: [MOCK_ADAPTER_RAW] })

      const adapters = await makeApi().listAdapters('inf_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/adapters',
      )
      expect(adapters).not.toBeNull()
      const a = (adapters as InferenceModelAdapter[])[0]
      expect(a.id).toBe('ad_1')
      expect(a.organizationId).toBe('org_1')
      expect(a.inferenceServiceId).toBe('inf_1')
      expect(a.baseModelId).toBe('llama-3.1-8b-instruct')
      expect(a.servedModelName).toBe('support-tuned')
      expect(a.version).toBe(3)
      expect(a.filesBucket).toBe('org-1-files')
      expect(a.filesKeyPrefix).toBe('adapters/support-tuned/v3')
      expect(a.adapterSha256).toBe('a'.repeat(64))
      expect(a.sizeBytes).toBe(134217728)
      expect(a.baseModelLicense).toBe('llama-3.1-community')
      expect(a.status).toBe('active')
      expect(a.promotedAt).toBe('2026-01-02T00:00:00Z')
      expect(a.deletedAt).toBeNull()
    })

    it('returns null when the service does not exist', async () => {
      mockFetch({ error: 'not found' }, 404)
      await expect(makeApi().listAdapters('missing')).resolves.toBeNull()
    })

    it('POSTs a bodyless promote and unwraps the adapter envelope', async () => {
      const fetchMock = mockFetch({ adapter: MOCK_ADAPTER_RAW })

      const adapter = await makeApi().promoteAdapter('inf_1', 'ad_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/adapters/ad_1/promote',
      )
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(init.body).toBeUndefined()
      expect(adapter.id).toBe('ad_1')
    })

    it('POSTs a bodyless demote', async () => {
      const fetchMock = mockFetch({
        adapter: { ...MOCK_ADAPTER_RAW, status: 'superseded' },
      })

      const adapter = await makeApi().demoteAdapter('inf_1', 'ad_1')

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/inf_1/adapters/ad_1/demote',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST')
      expect(adapter.status).toBe('superseded')
    })

    it('registers an adapter with a snake_case body', async () => {
      const fetchMock = mockFetch({
        adapter: { ...MOCK_ADAPTER_RAW, status: 'uploaded', inference_service_id: null },
      })

      const adapter = await makeApi().registerAdapter({
        organizationId: 'org_1',
        baseModelId: 'llama-3.1-8b-instruct',
        servedModelName: 'support-tuned',
        version: 3,
        filesBucket: 'org-1-files',
        filesKeyPrefix: 'adapters/support-tuned/v3',
        adapterSha256: 'a'.repeat(64),
        sizeBytes: 134217728,
        baseModelLicense: 'llama-3.1-community',
      })

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/adapters',
      )
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({
        organization_id: 'org_1',
        base_model_id: 'llama-3.1-8b-instruct',
        served_model_name: 'support-tuned',
        version: 3,
        files_bucket: 'org-1-files',
        files_key_prefix: 'adapters/support-tuned/v3',
        adapter_sha256: 'a'.repeat(64),
        size_bytes: 134217728,
        base_model_license: 'llama-3.1-community',
      })
      expect(adapter.status).toBe('uploaded')
      expect(adapter.inferenceServiceId).toBeNull()
    })

    it('DELETEs an adapter by id and surfaces a 409 on an active version', async () => {
      const fetchMock = mockFetch({}, 204)
      await makeApi().deleteAdapter('ad_1')
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.foundrydb.com/inference-services/adapters/ad_1',
      )
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')

      mockFetch({ error: 'adapter is active' }, 409)
      await expect(makeApi().deleteAdapter('ad_1')).rejects.toMatchObject({ statusCode: 409 })
    })
  })
})
