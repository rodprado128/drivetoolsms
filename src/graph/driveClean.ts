// Funções do módulo Drive Clean — prefixo dc_

import { getGraphClient } from './client'
import { withRetry } from './retry'
import type { DCScanState, DCHashEntry, DCDuplicateGroup } from './types'

// Caminho do state file no OneDrive do usuário
const STATE_FILE_PATH = '/me/drive/root:/_drivetools_dc_state.json:/content'

// Lê o state file. Retorna null se não existir.
export async function dc_loadState(): Promise<DCScanState | null> {
  const client = getGraphClient()
  try {
    const raw = await withRetry(() =>
      client.api(STATE_FILE_PATH).get()
    )
    // Trata retorno como string (text/plain) ou objeto (application/json)
    const state: DCScanState = typeof raw === 'string' ? JSON.parse(raw) : raw
    // Valida versão mínima
    if (!state || state.version !== 1) return null
    return state
  } catch (err: unknown) {
    const e = err as { statusCode?: number }
    if (e?.statusCode === 404) return null
    throw err
  }
}

// Grava o state file no OneDrive
export async function dc_saveState(state: DCScanState): Promise<void> {
  const client = getGraphClient()
  await withRetry(() =>
    client.api(STATE_FILE_PATH)
      .header('Content-Type', 'application/json')
      .put(state)
  )
}

// Remove o state file (reset do scan)
export async function dc_resetState(): Promise<void> {
  const client = getGraphClient()
  try {
    // Busca o item pelo path para obter o ID antes de deletar
    const item = await withRetry(() =>
      client.api('/me/drive/root:/_drivetools_dc_state.json').get()
    ) as { id: string }
    await withRetry(() =>
      client.api(`/me/drive/items/${item.id}`).delete()
    )
  } catch (err: unknown) {
    const e = err as { statusCode?: number }
    // 404 significa que o arquivo não existe: ok
    if (e?.statusCode === 404) return
    throw err
  }
}

interface ScanBatchResult {
  entries: DCHashEntry[]
  nextLink?: string
  scannedRaw: number
}

// Busca uma página de arquivos via delta. Retorna entradas com quickXorHash e nextLink.
export async function dc_scanBatch(nextLink?: string): Promise<ScanBatchResult> {
  const client = getGraphClient()

  let req = nextLink
    ? client.api(nextLink)
    : client
        .api('/me/drive/root/delta')
        .select('id,name,file,size,createdDateTime,lastModifiedDateTime,webUrl,parentReference,deleted')
        .top(200)

  const response = await withRetry(() => req.get()) as {
    value?: Array<{
      id: string
      name?: string
      file?: {
        mimeType?: string
        hashes?: { quickXorHash?: string }
      }
      size?: number
      createdDateTime?: string
      lastModifiedDateTime?: string
      webUrl?: string
      parentReference?: { path?: string }
      deleted?: { state?: string }
    }>
    '@odata.nextLink'?: string
    '@odata.deltaLink'?: string
  }

  const items = response.value ?? []
  const entries: DCHashEntry[] = []

  for (const item of items) {
    // Ignora itens deletados e pastas
    if (item.deleted || !item.file) continue
    const hash = item.file.hashes?.quickXorHash
    // Só processa arquivos com quickXorHash (arquivos sem hash não podem ser deduplicados)
    if (!hash) continue

    entries.push({
      hash,
      id: item.id,
      name: item.name ?? '(sem nome)',
      size: item.size ?? 0,
      createdDateTime: item.createdDateTime ?? '',
      lastModifiedDateTime: item.lastModifiedDateTime ?? '',
      webUrl: item.webUrl ?? '',
      parentPath: item.parentReference?.path,
    })
  }

  return {
    entries,
    nextLink: response['@odata.nextLink'],
    scannedRaw: items.length,
  }
}

// Deleta arquivos pelo ID, um a um, com retry
export async function dc_deleteFiles(
  ids: string[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const client = getGraphClient()
  let done = 0

  for (const id of ids) {
    await withRetry(() =>
      client.api(`/me/drive/items/${id}`).delete()
    )
    done++
    onProgress?.(done, ids.length)
  }
}

// Computa grupos de duplicatas a partir do state
export function dc_computeGroups(state: DCScanState): DCDuplicateGroup[] {
  const byHash = new Map<string, DCHashEntry[]>()

  for (const entry of state.hashEntries) {
    if (!byHash.has(entry.hash)) byHash.set(entry.hash, [])
    byHash.get(entry.hash)!.push(entry)
  }

  const groups: DCDuplicateGroup[] = []

  for (const [hash, files] of byHash) {
    if (files.length < 2) continue

    // Ordena por data de criação crescente (mais antigo = índice 0 = manter por padrão)
    const sorted = files.slice().sort(
      (a, b) => new Date(a.createdDateTime).getTime() - new Date(b.createdDateTime).getTime()
    )

    const size = sorted[0].size
    const wastedBytes = size * (sorted.length - 1)

    // Por padrão: manter o mais antigo, deletar os demais
    const toDelete = sorted.slice(1).map(f => f.id)

    groups.push({ hash, files: sorted, wastedBytes, toDelete })
  }

  // Ordena por desperdício decrescente
  return groups.sort((a, b) => b.wastedBytes - a.wastedBytes)
}
