import { useEffect, useState, useCallback } from 'react'
import { useMsal } from '@azure/msal-react'
import {
  dash_getStorageInfo,
  dash_getHeaviestFiles,
  dash_getOldHeavyFiles,
  dash_getInactiveFiles,
  dash_getRecommendation,
} from '../../graph/dashboard'
import type { StorageQuota, InsightFile, Recommendation } from '../../graph/types'
import { useToast } from '../../hooks/useToast'
import { StorageDonut } from './StorageDonut'
import { ModuleCards } from './ModuleCards'
import { RecommendCard } from './RecommendCard'
import { InsightsTabs } from './InsightsTabs'

export function DashboardPage() {
  const { accounts } = useMsal()
  const { addToast } = useToast()
  const displayName = accounts[0]?.name?.split(' ')[0] ?? 'você'

  const [quota, setQuota] = useState<StorageQuota | null>(null)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [heavyFiles, setHeavyFiles] = useState<InsightFile[]>([])
  const [oldFiles, setOldFiles] = useState<InsightFile[]>([])
  const [inactiveFiles, setInactiveFiles] = useState<InsightFile[]>([])

  const [loadingQuota, setLoadingQuota] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [recommendDismissed, setRecommendDismissed] = useState(false)

  // Erros aqui nunca devem quebrar a renderização. Só logam e exibem toast.
  const loadQuota = useCallback(async () => {
    setLoadingQuota(true)
    try {
      const [q, rec] = await Promise.all([
        dash_getStorageInfo(),
        dash_getRecommendation(),
      ])
      setQuota(q)
      setRecommendation(rec)
    } catch (err) {
      console.error('[Dashboard] falha ao carregar quota/recomendação:', err)
      addToast('Não foi possível carregar o uso do OneDrive.', 'error')
    } finally {
      setLoadingQuota(false)
    }
  }, [addToast])

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true)
    try {
      const [heavy, old, inactive] = await Promise.all([
        dash_getHeaviestFiles(),
        dash_getOldHeavyFiles(),
        dash_getInactiveFiles(),
      ])
      setHeavyFiles(heavy)
      setOldFiles(old)
      setInactiveFiles(inactive)
    } catch (err) {
      console.error('[Dashboard] falha ao carregar insights:', err)
      addToast('Não foi possível carregar os insights do drive.', 'error')
    } finally {
      setLoadingInsights(false)
    }
  }, [addToast])

  useEffect(() => {
    loadQuota()
    loadInsights()
  }, [loadQuota, loadInsights])

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Saudação */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          className="font-bold"
          style={{ fontSize: '32px', color: 'var(--color-sys-label)', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.1 }}
        >
          Olá, {displayName}
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
          Veja como está o seu OneDrive
        </p>
      </div>

      {/* Card de recomendação — aparece quando há lixeira */}
      {recommendation && !recommendDismissed && (
        <div style={{ marginBottom: '20px' }}>
          <RecommendCard
            recommendation={recommendation}
            onCleanupDone={() => {
              setRecommendDismissed(true)
              loadQuota()
            }}
          />
        </div>
      )}

      {/* Grid principal: donut + módulos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 380px) 1fr',
          gap: '20px',
          marginBottom: '20px',
          alignItems: 'stretch',
        }}
      >
        <StorageDonut quota={quota} loading={loadingQuota} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2
            className="font-semibold"
            style={{ fontSize: '17px', color: 'var(--color-sys-label)', margin: 0, letterSpacing: '-0.02em' }}
          >
            Módulos
          </h2>
          <ModuleCards />
        </div>
      </div>

      {/* Insights */}
      <InsightsTabs
        heavyFiles={heavyFiles}
        oldFiles={oldFiles}
        inactiveFiles={inactiveFiles}
        loading={loadingInsights}
      />
    </div>
  )
}
