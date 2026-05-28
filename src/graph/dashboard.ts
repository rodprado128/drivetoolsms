// Funções do módulo Dashboard — prefixo dash_

import { getGraphClient } from './client'
import { withRetry } from './retry'
import type { StorageQuota, InsightFile, Recommendation, DriveItem } from './types'

// Mapeia DriveItem para InsightFile
function toInsightFile(item: DriveItem): InsightFile {
  return {
    id: item.id,
    name: item.name,
    size: item.size ?? 0,
    mimeType: item.file?.mimeType ?? 'application/octet-stream',
    webUrl: item.webUrl,
    lastModifiedDateTime: item.lastModifiedDateTime,
  }
}

// Retorna informações de quota do drive do usuário
export async function dash_getStorageInfo(): Promise<StorageQuota> {
  const client = getGraphClient()

  const drive = await withRetry(() =>
    client.api('/me/drive').select('quota').get()
  ) as { quota: { used?: number; deleted?: number; remaining?: number; total?: number; state?: string } }

  const q = drive.quota ?? {}
  return {
    used: q.used ?? 0,
    deleted: q.deleted ?? 0,
    remaining: q.remaining ?? 0,
    total: q.total ?? 0,
    state: (q.state as StorageQuota['state']) ?? 'normal',
  }
}

// Enumera arquivos do drive via delta. Coleta no máximo `cap` itens em N páginas
// para não travar o dashboard em drives muito grandes. Retorna apenas itens com .file.
async function fetchDriveSample(cap: number): Promise<DriveItem[]> {
  const client = getGraphClient()

  // OBS: NÃO usar /me/drive/root/search(q='') — Graph rejeita query vazia com
  // erro "Search Query cannot be empty". Delta enumera o drive inteiro paginado
  // e é o substituto correto para uma listagem geral.
  let req = client
    .api('/me/drive/root/delta')
    .select('id,name,size,webUrl,lastModifiedDateTime,file')
    .top(200)

  const collected: DriveItem[] = []
  let nextLink: string | undefined

  do {
    const response = await withRetry(() => req.get()) as {
      value?: DriveItem[]
      '@odata.nextLink'?: string
    }
    const page = response.value ?? []
    for (const item of page) {
      if (item.file) collected.push(item)
      if (collected.length >= cap) return collected
    }
    nextLink = response['@odata.nextLink']
    if (nextLink) req = client.api(nextLink)
  } while (nextLink)

  return collected
}

// Retorna os N arquivos mais pesados do drive
export async function dash_getHeaviestFiles(top = 20): Promise<InsightFile[]> {
  const items = await fetchDriveSample(2000)
  return items
    .filter(item => (item.size ?? 0) > 0)
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, top)
    .map(toInsightFile)
}

// Retorna arquivos antigos (>1 ano) e pesados (>10 MB)
export async function dash_getOldHeavyFiles(top = 20): Promise<InsightFile[]> {
  const umAnoAtras = new Date()
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1)
  const cutoff = umAnoAtras.toISOString()

  const items = await fetchDriveSample(2000)
  return items
    .filter(item =>
      (item.size ?? 0) > 10 * 1024 * 1024 &&
      item.lastModifiedDateTime < cutoff
    )
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, top)
    .map(toInsightFile)
}

// Retorna os arquivos há mais tempo sem modificação (proxy para inativos)
export async function dash_getInactiveFiles(top = 20): Promise<InsightFile[]> {
  const items = await fetchDriveSample(2000)
  return items
    .filter(item => (item.size ?? 0) > 0)
    .sort((a, b) =>
      new Date(a.lastModifiedDateTime).getTime() - new Date(b.lastModifiedDateTime).getTime()
    )
    .slice(0, top)
    .map(toInsightFile)
}

// Retorna recomendação de limpeza com base em lixeira e scans existentes
export async function dash_getRecommendation(): Promise<Recommendation | null> {
  const quota = await dash_getStorageInfo()
  if (quota.deleted === 0) return null

  return {
    trashSize: quota.deleted,
    duplicateCount: 0,
    duplicateWaste: 0,
    hasScan: false,
  }
}

// Move um ou mais arquivos para a lixeira (DELETE = soft delete no OneDrive)
export async function dash_trashFiles(ids: string[]): Promise<void> {
  const client = getGraphClient()

  for (const id of ids) {
    await withRetry(() =>
      client.api(`/me/drive/items/${id}`).delete()
    )
  }
}
