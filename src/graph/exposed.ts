// Funções do módulo Drive Exposed — prefixo exp_

import { getGraphClient } from './client'
import { withRetry } from './retry'
import type { ExpItem, ExpPermission, ExpExposureType, ExpScanState } from './types'

const STATE_FILE_PATH = '/me/drive/root:/_drivetools_exp_state.json:/content'

export async function exp_loadState(): Promise<ExpScanState | null> {
  const client = getGraphClient()
  try {
    const raw = await withRetry(() => client.api(STATE_FILE_PATH).get())
    const state: ExpScanState = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!state || state.version !== 1) return null
    return state
  } catch (err: unknown) {
    // 404 é a resposta esperada na primeira execução, quando o state file não
    // existe. O Graph SDK pode reportar isso em formatos diferentes
    // (statusCode, status, code === 'itemNotFound'), então checamos todos.
    if (isNotFound(err)) return null
    throw err
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as {
    statusCode?: number
    status?: number
    code?: string
    body?: { error?: { code?: string } }
  } | null
  if (!e) return false
  if (e.statusCode === 404 || e.status === 404) return true
  if (e.code === 'itemNotFound') return true
  if (e.body?.error?.code === 'itemNotFound') return true
  return false
}

export async function exp_saveState(state: ExpScanState): Promise<void> {
  const client = getGraphClient()
  await withRetry(() =>
    client.api(STATE_FILE_PATH).header('Content-Type', 'application/json').put(state)
  )
}

export async function exp_resetState(): Promise<void> {
  const client = getGraphClient()
  try {
    const item = await withRetry(() =>
      client.api('/me/drive/root:/_drivetools_exp_state.json').get()
    ) as { id: string }
    await withRetry(() => client.api(`/me/drive/items/${item.id}`).delete())
  } catch (err: unknown) {
    if (isNotFound(err)) return
    throw err
  }
}

interface RawPermission {
  id: string
  roles?: string[]
  grantedTo?: { user?: { displayName?: string; email?: string } }
  grantedToIdentities?: Array<{ user?: { displayName?: string; email?: string } }>
  link?: { scope?: string; webUrl?: string; type?: string }
  inheritedFrom?: { id?: string }
}

function classifyPermission(perm: RawPermission): ExpPermission | null {
  // Ignora permissões herdadas (do pai) e do próprio dono
  if (perm.inheritedFrom) return null
  if (!perm.link && !perm.grantedTo && !perm.grantedToIdentities) return null

  let type: ExpExposureType
  let riskScore: 3 | 2 | 1
  let displayName: string | undefined
  let email: string | undefined
  let link: ExpPermission['link']

  if (perm.link) {
    const scope = perm.link.scope ?? ''
    if (scope === 'anonymous') {
      type = 'anonymous'
      riskScore = 3
    } else if (scope === 'users') {
      type = 'external'
      riskScore = 2
    } else {
      // 'organization' ou outros — interno
      type = 'internal'
      riskScore = 1
    }
    link = { scope, webUrl: perm.link.webUrl ?? '' }
  } else if (perm.grantedToIdentities && perm.grantedToIdentities.length > 0) {
    const user = perm.grantedToIdentities[0].user
    displayName = user?.displayName
    email = user?.email
    type = 'external'
    riskScore = 2
  } else if (perm.grantedTo?.user) {
    const user = perm.grantedTo.user
    displayName = user.displayName
    email = user.email
    type = 'internal'
    riskScore = 1
  } else {
    return null
  }

  return { id: perm.id, type, riskScore, displayName, email, link }
}

interface ScanBatchResult {
  items: ExpItem[]
  folderQueue: string[]
  nextLinks: Record<string, string>
  scannedFolders: number
}

// Executa um batch do BFS: processa a primeira pasta da fila ou segue um nextLink existente
export async function exp_scanBatch(
  folderQueue: string[],
  nextLinks: Record<string, string>
): Promise<ScanBatchResult> {
  const client = getGraphClient()

  if (folderQueue.length === 0) {
    return { items: [], folderQueue: [], nextLinks, scannedFolders: 0 }
  }

  const folderId = folderQueue[0]
  const remainingQueue = folderQueue.slice(1)
  const newNextLinks = { ...nextLinks }

  const url = newNextLinks[folderId]
    ?? (folderId === 'root'
      ? '/me/drive/root/children'
      : `/me/drive/items/${folderId}/children`)

  // Limpa nextLink usado
  delete newNextLinks[folderId]

  const req = client
    .api(url)
    .expand('permissions')
    .select('id,name,folder,file,parentReference,webUrl')
    .top(200)

  const response = await withRetry(() => req.get()) as {
    value?: Array<{
      id: string
      name?: string
      folder?: object
      file?: object
      parentReference?: { path?: string }
      webUrl?: string
      permissions?: RawPermission[]
    }>
    '@odata.nextLink'?: string
  }

  const pageItems: ExpItem[] = []
  const subFolders: string[] = []

  for (const item of response.value ?? []) {
    if (item.folder) {
      subFolders.push(item.id)
      continue
    }

    const rawPerms: RawPermission[] = item.permissions ?? []
    const classified = rawPerms
      .map(classifyPermission)
      .filter((p): p is ExpPermission => p !== null)

    if (classified.length === 0) continue

    const maxRisk = classified.reduce(
      (max, p) => (p.riskScore > max ? p.riskScore : max),
      1 as 3 | 2 | 1
    )

    const path = item.parentReference?.path
      ?.replace('/drive/root:', '')
      .replace('/me/drive/root:', '') ?? '/'

    pageItems.push({
      id: item.id,
      name: item.name ?? '(sem nome)',
      path,
      webUrl: item.webUrl ?? '',
      permissions: classified,
      maxRisk,
    })
  }

  const odataNextLink = response['@odata.nextLink']
  let nextQueue = [...remainingQueue, ...subFolders]

  if (odataNextLink) {
    // Mantém a mesma pasta no início da fila para continuar paginação
    nextQueue = [folderId, ...nextQueue]
    newNextLinks[folderId] = odataNextLink
  }

  return {
    items: pageItems,
    folderQueue: nextQueue,
    nextLinks: newNextLinks,
    scannedFolders: 1,
  }
}

// Revoga uma permissão individual
export async function exp_revokePermission(itemId: string, permId: string): Promise<void> {
  const client = getGraphClient()
  await withRetry(() =>
    client.api(`/me/drive/items/${itemId}/permissions/${permId}`).delete()
  )
}

// Revoga uma lista de permissões em lote
export async function exp_revokePermissionsBatch(
  permissions: Array<{ itemId: string; permId: string }>,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  let done = 0
  for (const { itemId, permId } of permissions) {
    await exp_revokePermission(itemId, permId)
    done++
    onProgress?.(done, permissions.length)
  }
}
