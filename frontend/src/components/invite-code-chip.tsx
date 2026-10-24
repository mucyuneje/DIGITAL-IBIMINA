'use client'

/**
 * Compact invite-code chip (pitch book, R14).
 *
 * Shows the group's real invite code and copies it to the clipboard on tap,
 * with a toast so the copy is never silent.
 */
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'
import { CheckIcon, CopyIcon } from '@/components/icons'

export function InviteCodeChip({
  tone = 'light',
  size = 'default',
}: {
  tone?: 'light' | 'dark'
  size?: 'default' | 'tiny'
}) {
  const { t } = useTranslation()
  const { group } = useData()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const code = group?.inviteCode ?? ''
  const tiny = size === 'tiny'

  const copy = useCallback(async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success(t('group.copied'), code)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error(t('states.errorTitle'))
    }
  }, [code, t, toast])

  const base = tiny
    ? 'inline-flex min-h-11 items-center gap-1 rounded-chip px-1.5 text-[10px] font-700 sm:min-h-6'
    : 'inline-flex min-h-11 items-center gap-1.5 rounded-chip border px-2.5 text-[12px] font-700 sm:min-h-8'
  const toneClass = tiny
    ? tone === 'dark'
      ? 'text-white/55 transition-colors hover:bg-white/10 hover:text-white'
      : 'text-muted transition-colors hover:bg-line/40 hover:text-ink'
    : tone === 'dark'
      ? 'border-white/20 bg-white/[0.08] text-white transition-colors hover:bg-white/15'
      : 'border-line bg-card text-ink transition-colors hover:border-green/40 hover:text-green'

  if (!code) {
    return (
      <span className={`${base} ${toneClass} ${tiny ? '' : 'text-white/40'}`}>—</span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`${t('group.inviteCode')} — ${t('common.copy')}`}
      title={t('group.inviteCode')}
      className={`${base} ${toneClass}`}
    >
      <span className="font-mono tracking-wide">{code}</span>
      {copied ? (
        <CheckIcon className={`${tiny ? 'size-3' : 'size-3.5'} text-success`} />
      ) : (
        <CopyIcon className={`${tiny ? 'size-3' : 'size-3.5'} opacity-60`} />
      )}
    </button>
  )
}
