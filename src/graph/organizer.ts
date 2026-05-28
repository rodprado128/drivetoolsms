// Funções do módulo Drive Organizer — prefixo org_

import { getGraphClient } from './client'
import { withRetry } from './retry'
import type { OrgItem, OrgCategory, OrgScanState } from './types'

const STATE_FILE_PATH = '/me/drive/root:/_drivetools_org_state.json:/content'

export async function org_loadState(): Promise<OrgScanState | null> {
  const client = getGraphClient()
  try {
    const raw = await withRetry(() => client.api(STATE_FILE_PATH).get())
    const state: OrgScanState = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!state || state.version !== 1) return null
    return state
  } catch (err: unknown) {
    const e = err as { statusCode?: number }
    if (e?.statusCode === 404) return null
    throw err
  }
}

export async function org_saveState(state: OrgScanState): Promise<void> {
  const client = getGraphClient()
  await withRetry(() =>
    client.api(STATE_FILE_PATH).header('Content-Type', 'application/json').put(state)
  )
}

export async function org_resetState(): Promise<void> {
  const client = getGraphClient()
  try {
    const item = await withRetry(() =>
      client.api('/me/drive/root:/_drivetools_org_state.json').get()
    ) as { id: string }
    await withRetry(() => client.api(`/me/drive/items/${item.id}`).delete())
  } catch (err: unknown) {
    const e = err as { statusCode?: number }
    if (e?.statusCode === 404) return
    throw err
  }
}

function classifyMime(mimeType: string): OrgCategory {
  if (mimeType.startsWith('image/')) return 'Imagens'
  if (mimeType.startsWith('video/')) return 'Vídeos'
  if (mimeType.startsWith('audio/')) return 'Áudio'
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'text/plain' ||
    mimeType.startsWith('application/vnd.openxmlformats-officedocument.') ||
    mimeType.startsWith('application/vnd.ms-')
  ) return 'Documentos'
  if (
    mimeType === 'text/html' ||
    mimeType === 'text/css' ||
    mimeType === 'text/javascript' ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType.startsWith('text/x-') ||
    mimeType.startsWith('application/x-')
  ) return 'Código'
  return 'Outros'
}

interface ScanRootResult {
  items: OrgItem[]
  nextLink?: string
}

// Busca uma página de arquivos soltos na raiz do OneDrive
export async function org_scanRoot(nextLink?: string): Promise<ScanRootResult> {
  const client = getGraphClient()

  const req = nextLink
    ? client.api(nextLink)
    : client
        .api('/me/drive/root/children')
        .select('id,name,size,file,lastModifiedDateTime,webUrl')
        .top(200)

  const response = await withRetry(() => req.get()) as {
    value?: Array<{
      id: string
      name?: string
      size?: number
      file?: { mimeType?: string }
      lastModifiedDateTime?: string
      webUrl?: string
    }>
    '@odata.nextLink'?: string
  }

  const items: OrgItem[] = (response.value ?? [])
    .filter(item => !!item.file)
    .map(item => {
      const mimeType = item.file!.mimeType ?? 'application/octet-stream'
      return {
        id: item.id,
        name: item.name ?? '(sem nome)',
        size: item.size ?? 0,
        mimeType,
        category: classifyMime(mimeType),
        lastModifiedDateTime: item.lastModifiedDateTime ?? '',
        webUrl: item.webUrl ?? '',
      }
    })

  return { items, nextLink: response['@odata.nextLink'] }
}

// Busca ou cria uma pasta na raiz do OneDrive pelo nome
export async function org_getOrCreateFolder(name: string): Promise<string> {
  const client = getGraphClient()

  // Verifica se a pasta já existe
  try {
    const existing = await withRetry(() =>
      client
        .api('/me/drive/root/children')
        .filter(`name eq '${name}' and folder ne null`)
        .select('id')
        .top(1)
        .get()
    ) as { value?: Array<{ id: string }> }

    if (existing.value && existing.value.length > 0) {
      return existing.value[0].id
    }
  } catch {
    // Ignora erros de filtro e tenta criar
  }

  // Cria a pasta
  const created = await withRetry(() =>
    client.api('/me/drive/root/children').post({
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    })
  ) as { id: string }

  return created.id
}

// Move arquivos para uma pasta de destino
export async function org_moveFiles(
  fileIds: string[],
  targetFolderId: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const client = getGraphClient()
  let done = 0

  for (const id of fileIds) {
    await withRetry(() =>
      client.api(`/me/drive/items/${id}`).patch({
        parentReference: { id: targetFolderId },
      })
    )
    done++
    onProgress?.(done, fileIds.length)
  }
}
