// Server-only thin REST client for ZeroEntropy. No SDK dependency.
// Every call is best-effort: callers must fall back so the demo never breaks.

const BASE = process.env.ZEROENTROPY_BASE_URL ?? 'https://api.zeroentropy.dev/v1'
const KEY = process.env.ZEROENTROPY_API_KEY
export const ZE_COLLECTION = process.env.ZEROENTROPY_COLLECTION ?? 'neverzero'

export const zeEnabled = (): boolean => Boolean(KEY)

async function ze<T>(path: string, body: unknown, timeoutMs = 4000): Promise<T> {
  if (!KEY) throw new Error('ZEROENTROPY_API_KEY not set')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`ZE ${path} ${res.status}: ${txt.slice(0, 200)}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

export async function ensureCollection(name = ZE_COLLECTION): Promise<void> {
  try {
    await ze('/collections/add-collection', { collection_name: name })
  } catch (e) {
    // 409 = already exists → fine. Anything else, let caller decide.
    if (!/\b409\b/.test(String(e))) throw e
  }
}

export async function addDocument(
  path: string,
  text: string,
  metadata: Record<string, string> = {},
  collection = ZE_COLLECTION,
): Promise<void> {
  await ze('/documents/add-document', {
    collection_name: collection,
    path,
    content: { type: 'text', text },
    metadata,
  })
}

export interface ZeSnippet { path: string; content: string; score: number }

export async function topSnippets(
  query: string,
  k = 6,
  collection = ZE_COLLECTION,
): Promise<ZeSnippet[]> {
  const r = await ze<{ results: ZeSnippet[] }>('/queries/top-snippets', {
    collection_name: collection,
    query: query.slice(0, 4096),
    k,
    reranker: 'zerank-2',
  })
  return r.results ?? []
}
