// Tipos compartilhados da camada Graph

export interface StorageQuota {
  used: number
  deleted: number
  remaining: number
  total: number
  state: 'normal' | 'nearing' | 'critical' | 'exceeded'
}

export interface DriveItemHashes {
  quickXorHash?: string
  sha256Hash?: string
}

export interface DriveItemFile {
  mimeType: string
  hashes?: DriveItemHashes
}

export interface DriveItemFolder {
  childCount: number
}

export interface DriveItemParent {
  id: string
  name: string
  path: string
  driveType?: string
}

export interface DriveItem {
  id: string
  name: string
  size?: number
  lastModifiedDateTime: string
  createdDateTime: string
  webUrl: string
  parentReference?: DriveItemParent
  file?: DriveItemFile
  folder?: DriveItemFolder
}

export interface InsightFile {
  id: string
  name: string
  size: number
  mimeType: string
  webUrl: string
  lastModifiedDateTime: string
}

export interface Recommendation {
  trashSize: number
  duplicateCount: number
  duplicateWaste: number
  hasScan: boolean
}

// ===== DRIVE CLEAN =====

export interface DCHashEntry {
  hash: string
  id: string
  name: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  webUrl: string
  parentPath?: string
}

export interface DCScanState {
  version: 1
  phase: 'scanning' | 'complete'
  nextLink?: string
  scannedCount: number
  hashEntries: DCHashEntry[]
  startedAt: string
  completedAt?: string
}

export interface DCDuplicateGroup {
  hash: string
  files: DCHashEntry[]
  wastedBytes: number
  toDelete: string[]
}

// ===== DRIVE ORGANIZER =====

export type OrgCategory = 'Imagens' | 'Documentos' | 'Vídeos' | 'Áudio' | 'Código' | 'Outros'

export interface OrgItem {
  id: string
  name: string
  size: number
  mimeType: string
  category: OrgCategory
  lastModifiedDateTime: string
  webUrl: string
}

export interface OrgScanState {
  version: 1
  scannedAt: string
  items: OrgItem[]
  nextLink?: string
  isComplete: boolean
}

// ===== DRIVE EXPOSED =====

export type ExpExposureType = 'anonymous' | 'external' | 'internal'

export interface ExpPermission {
  id: string
  type: ExpExposureType
  displayName?: string
  email?: string
  link?: { scope: string; webUrl: string }
  riskScore: 3 | 2 | 1
}

export interface ExpItem {
  id: string
  name: string
  path: string
  webUrl: string
  permissions: ExpPermission[]
  maxRisk: 3 | 2 | 1
}

export interface ExpScanState {
  version: 1
  scannedAt: string
  items: ExpItem[]
  folderQueue: string[]
  nextLinks: Record<string, string>
  isComplete: boolean
}
