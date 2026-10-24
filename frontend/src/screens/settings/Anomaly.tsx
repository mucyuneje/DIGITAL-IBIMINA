'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlertIcon } from 'lucide-react'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { PinGateModal, type PinGateResult } from '@/components/pin-gate'
import { ShieldIcon } from '@/components/icons'
import { SettingsPageHeader } from '@/components/settings-page-header'
import { detectAnomalies, type Anomaly, type AnomalyCode } from '@shared/anomaly'
import { currentLanguage } from '@/i18n'
import { errorKeyFrom } from '@/lib/errors'
import { formatDate } from '@shared/money'
import {
  loadReviewedAnomalies,
  subscribeAnomalyReviews,
} from '@/services/reviewedAnomalies'

const LABEL_KEY: Record<AnomalyCode, string> = {
  largeWithdrawal: 'anomalyReview.largeWithdrawalLabel',
  rapidVotes: 'anomalyReview.rapidVotesLabel',
}

export function SettingsAnomaly() {
  const { t } = useTranslation()
  const { auditLogs, petitions, members, call } = useData()
  const toast = useToast()
  const language = currentLanguage()
  const [reviewed, setReviewed] = useState<string[]>([])
  const [pending, setPending] = useState<string | null>(null)

  // Reviewed marks live in the backend, not in this component: they survive a
  // refresh and show up in the other tab (P2-12).
  useEffect(() => {
    const reload = () => setReviewed(loadReviewedAnomalies())
    reload()
    return subscribeAnomalyReviews(reload)
  }, [])

  const anomalies = useMemo(
    () => detectAnomalies(auditLogs, petitions),
    [auditLogs, petitions],
  )

  const memberIdFor = (flag: Anomaly): string | null => {
    const entry = auditLogs.find((log) => log.id === flag.refId || log.relatedId === flag.refId)
    if (entry) return entry.initiatorId
    const petition = petitions.find((item) => item.id === flag.refId)
    return petition ? petition.createdBy : null
  }

  const markReviewed = async (): Promise<PinGateResult> => {
    if (!pending) return { ok: false, errorKey: 'errors.generic' }
    try {
      const res = await call('markAnomalyReviewed', { anomalyId: pending })
      if (res.ok) {
        setReviewed(loadReviewedAnomalies())
        toast.success(t('anomalyReview.reviewedNote'))
        return { ok: true }
      }
      return { ok: false, errorKey: res.errorKey }
    } catch (cause) {
      return { ok: false, errorKey: errorKeyFrom(cause) }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsPageHeader
        icon={TriangleAlertIcon}
        tone="gold"
        title={t('anomalyReview.title')}
        subtitle={t('settingsIndex.anomalyHint')}
      />

      {anomalies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('anomalyReview.empty')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <ul className="divide-y divide-line">
            {anomalies.map((flag) => {
              const id = `${flag.code}:${flag.refId ?? String(flag.at)}`
              const isReviewed = reviewed.includes(id)
              const memberId = memberIdFor(flag)
              const member = memberId
                ? members.find((item) => item.id === memberId)
                : undefined
              return (
                <li key={id} className="flex flex-col gap-3 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{t(LABEL_KEY[flag.code])}</Badge>
                    <Badge
                      className={
                        flag.severity === 'high' ? 'bg-danger-bg text-danger' : 'bg-pending-bg text-pending'
                      }
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                    </Badge>
                    <Badge
                      className={
                        isReviewed ? 'bg-success-bg text-success' : 'bg-ink/[0.06] text-muted'
                      }
                    >
                      {isReviewed
                        ? t('anomalyReview.reviewed')
                        : t('anomalyReview.unreviewed')}
                    </Badge>
                  </div>
                  <p className="text-[14px] font-700 text-ink">
                    {t(`anomaly.${flag.code}`, flag.params)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-500 text-muted">
                    <span>
                      {t('anomalyReview.member')}:{' '}
                      <span className="font-700 text-ink">
                        {member?.name ?? t('anomalyReview.unknownMember')}
                      </span>
                    </span>
                    <span>
                      {t('anomalyReview.date')}: {formatDate(flag.at, language)}
                    </span>
                  </div>
                  {isReviewed ? null : (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPending(id)}
                      >
                        <ShieldIcon className="size-3.5" />
                        {t('anomalyReview.markReviewed')}
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <PinGateModal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('anomalyReview.markReviewed')}
        submitLabel={t('anomalyReview.markReviewed')}
        onSubmit={markReviewed}
      />
    </div>
  )
}
