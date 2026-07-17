import { InferenceServicesAPI } from '../inference-services'
import { HTTPClient } from '../client'
import { FoundryDBError } from '../types'
import type { InferenceModelAdapter } from '../types'

const BASE_CONFIG = {
  apiUrl: 'https://api.foundrydb.com',
  username: 'admin',
  password: 'secret',
}

function makeHttpClient(): HTTPClient {
  return new HTTPClient(BASE_CONFIG)
}

function mockFetch(body: unknown, status = 200): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  })
  globalThis.fetch = fetchMock
  return fetchMock
}

const MOCK_ADAPTER_RAW = {
  id: 'adp_1',
  organization_id: 'org_1',
  inference_service_id: null,
  base_model_id: 'mistral-small',
  served_model_name: 'support-bot',
  version: 3,
  files_bucket: 'org-1-adapters',
  files_key_prefix: 'support-bot/v3',
  adapter_sha256: 'a'.repeat(64),
  size_bytes: 104857600,
  base_model_license: 'apache-2.0',
  status: 'uploaded',
  created_at: '2026-07-17T00:00:00Z',
  promoted_at: null,
}

describe('InferenceServicesAPI', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('registerAdapter', () => {
    it('POSTs /inference-services/adapters with a snake_case body and returns the camelCase adapter', async () => {
      const fetchMock = mockFetch({ adapter: MOCK_ADAPTER_RAW }, 201)
      const api = new InferenceServicesAPI(makeHttpClient())

      const result: InferenceModelAdapter = await api.registerAdapter({
        baseModelId: 'mistral-small',
        servedModelName: 'support-bot',
        version: 3,
        filesBucket: 'org-1-adapters',
        filesKeyPrefix: 'support-bot/v3',
        adapterSha256: 'a'.repeat(64),
        sizeBytes: 104857600,
        baseModelLicense: 'apache-2.0',
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.foundrydb.com/inference-services/adapters')
      expect(init.method).toBe('POST')
      const sentBody = JSON.parse(init.body as string)
      expect(sentBody.base_model_id).toBe('mistral-small')
      expect(sentBody.served_model_name).toBe('support-bot')
      expect(sentBody.version).toBe(3)
      expect(sentBody.files_bucket).toBe('org-1-adapters')
      expect(sentBody.files_key_prefix).toBe('support-bot/v3')
      expect(sentBody.adapter_sha256).toBe('a'.repeat(64))
      expect(sentBody.size_bytes).toBe(104857600)

      expect(result.id).toBe('adp_1')
      expect(result.organizationId).toBe('org_1')
      expect(result.inferenceServiceId).toBeNull()
      expect(result.baseModelId).toBe('mistral-small')
      expect(result.servedModelName).toBe('support-bot')
      expect(result.version).toBe(3)
      expect(result.filesKeyPrefix).toBe('support-bot/v3')
      expect(result.adapterSha256).toBe('a'.repeat(64))
      expect(result.sizeBytes).toBe(104857600)
      expect(result.status).toBe('uploaded')
      expect(result.promotedAt).toBeNull()
    })

    it('sends X-Active-Org-ID when organizationId is provided', async () => {
      const fetchMock = mockFetch({ adapter: MOCK_ADAPTER_RAW }, 201)
      const api = new InferenceServicesAPI(makeHttpClient())

      await api.registerAdapter({
        organizationId: 'org_99',
        baseModelId: 'mistral-small',
        servedModelName: 'support-bot',
        version: 1,
        filesBucket: 'b',
        filesKeyPrefix: 'p',
        adapterSha256: 'a'.repeat(64),
        sizeBytes: 1,
      })

      const [, init] = fetchMock.mock.calls[0]
      expect((init.headers as Record<string, string>)['X-Active-Org-ID']).toBe('org_99')
      const sentBody = JSON.parse(init.body as string)
      expect(sentBody.organization_id).toBe('org_99')
    })

    it('throws FoundryDBError on 409 conflict', async () => {
      mockFetch({ error: 'version already registered' }, 409)
      const api = new InferenceServicesAPI(makeHttpClient())

      await expect(
        api.registerAdapter({
          baseModelId: 'mistral-small',
          servedModelName: 'support-bot',
          version: 1,
          filesBucket: 'b',
          filesKeyPrefix: 'p',
          adapterSha256: 'a'.repeat(64),
          sizeBytes: 1,
        }),
      ).rejects.toBeInstanceOf(FoundryDBError)
    })
  })

  describe('listAdapters', () => {
    it('GETs /inference-services/{id}/adapters and returns the bound + eligible-uploaded versions', async () => {
      const active = {
        ...MOCK_ADAPTER_RAW,
        id: 'adp_2',
        inference_service_id: 'svc_1',
        version: 2,
        status: 'active',
        promoted_at: '2026-07-17T01:00:00Z',
      }
      const fetchMock = mockFetch({ adapters: [MOCK_ADAPTER_RAW, active] })
      const api = new InferenceServicesAPI(makeHttpClient())

      const result = await api.listAdapters('svc_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toBe('https://api.foundrydb.com/inference-services/svc_1/adapters')
      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('uploaded')
      expect(result[0].inferenceServiceId).toBeNull()
      expect(result[1].status).toBe('active')
      expect(result[1].inferenceServiceId).toBe('svc_1')
      expect(result[1].promotedAt).toBe('2026-07-17T01:00:00Z')
    })

    it('returns an empty array when nothing is bound or promotable', async () => {
      mockFetch({ adapters: [] })
      const api = new InferenceServicesAPI(makeHttpClient())
      const result = await api.listAdapters('svc_1')
      expect(result).toEqual([])
    })

    it('throws FoundryDBError on 404', async () => {
      mockFetch({ error: 'not found' }, 404)
      const api = new InferenceServicesAPI(makeHttpClient())
      await expect(api.listAdapters('missing')).rejects.toBeInstanceOf(FoundryDBError)
    })
  })

  describe('promoteAdapter', () => {
    it('POSTs the promote route and returns the now-active adapter', async () => {
      const promoted = {
        ...MOCK_ADAPTER_RAW,
        inference_service_id: 'svc_1',
        status: 'active',
        promoted_at: '2026-07-17T02:00:00Z',
      }
      const fetchMock = mockFetch({ adapter: promoted })
      const api = new InferenceServicesAPI(makeHttpClient())

      const result = await api.promoteAdapter('svc_1', 'adp_1')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.foundrydb.com/inference-services/svc_1/adapters/adp_1/promote')
      expect(init.method).toBe('POST')
      expect(result.status).toBe('active')
      expect(result.inferenceServiceId).toBe('svc_1')
      expect(result.promotedAt).toBe('2026-07-17T02:00:00Z')
    })

    it('throws FoundryDBError on 400 base-model mismatch', async () => {
      mockFetch({ error: 'base model mismatch' }, 400)
      const api = new InferenceServicesAPI(makeHttpClient())
      await expect(api.promoteAdapter('svc_1', 'adp_1')).rejects.toBeInstanceOf(FoundryDBError)
    })
  })
})
