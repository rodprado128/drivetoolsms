// Retry exponencial para chamadas Graph — respeita Retry-After em 429

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

// Erro retornado pelo Graph Client com statusCode e headers
interface GraphApiError {
  statusCode?: number
  headers?: Record<string, string>
  message?: string
}

function parseRetryAfterMs(headers: Record<string, string>): number | null {
  const retryAfter = headers['Retry-After'] ?? headers['retry-after']
  if (!retryAfter) return null

  const seconds = parseInt(retryAfter, 10)
  if (!isNaN(seconds)) return seconds * 1000

  // Formato data ISO / RFC 1123
  const date = new Date(retryAfter).getTime()
  if (!isNaN(date)) return Math.max(0, date - Date.now())

  return null
}

function isRetryable(err: unknown): boolean {
  const graphErr = err as GraphApiError
  return graphErr?.statusCode === 429 || graphErr?.statusCode === 503
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (err) {
      if (!isRetryable(err) || attempt >= MAX_RETRIES) {
        throw err
      }

      const graphErr = err as GraphApiError
      let waitMs: number

      if (graphErr.headers) {
        const headerWait = parseRetryAfterMs(graphErr.headers)
        waitMs = headerWait ?? BASE_DELAY_MS * Math.pow(2, attempt)
      } else {
        waitMs = BASE_DELAY_MS * Math.pow(2, attempt)
      }

      // Jitter de 0-500ms para evitar thundering herd
      const jitter = Math.random() * 500
      await new Promise(resolve => setTimeout(resolve, waitMs + jitter))

      attempt++
    }
  }
}
