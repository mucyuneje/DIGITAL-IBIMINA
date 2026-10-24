'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon } from 'lucide-react'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LedgerIcon } from '@/components/icons'
import { SettingsPageHeader } from '@/components/settings-page-header'

const CSV_HEADER = 'TXN ID, type, amount, initiator, details, timestamp, PIN verified'

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function SettingsExport() {
  const { t } = useTranslation()
  const { auditLogs } = useData()
  const toast = useToast()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const exportCsv = () => {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
    const rows = auditLogs.filter(
      (entry) => entry.timestamp >= start && entry.timestamp <= end,
    )

    if (rows.length === 0) {
      toast.push({ tone: 'info', title: t('exportLedger.empty') })
      return
    }

    const lines = rows.map((entry) =>
      [
        entry.txnId,
        entry.type,
        String(entry.amount),
        entry.initiatorName,
        entry.detail,
        new Date(entry.timestamp).toISOString(),
        entry.pinVerified ? 'true' : 'false',
      ]
        .map(csvCell)
        .join(','),
    )

    const blob = new Blob([[CSV_HEADER, ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'ibimina-ledger.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    toast.success(t('exportLedger.done'))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsPageHeader
        icon={DownloadIcon}
        title={t('exportLedger.title')}
        subtitle={t('settingsIndex.exportHint')}
      />

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
              <LedgerIcon className="size-[18px]" />
            </span>
            <p className="pt-1 text-[13px] font-500 leading-relaxed text-muted">
              {t('exportLedger.note')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('exportLedger.from')}</FieldLabel>
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('exportLedger.to')}</FieldLabel>
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={exportCsv}>
              <LedgerIcon />
              {t('exportLedger.action')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
