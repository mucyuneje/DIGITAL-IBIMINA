'use client'

import type { ComponentType, ReactNode } from 'react'
import { cn } from 'cn'
import { useDocumentTitle } from '@/lib/use-document-title'

export type PageIcon = ComponentType<{
  className?: string
  strokeWidth?: number
  'aria-hidden'?: boolean | 'true' | 'false'
}>

const TONE = {
  green: 'bg-green text-gold',
  gold: 'bg-gold-soft text-pending',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-ink/[0.055] text-ink',
} as const

export type PageHeadingTone = keyof typeof TONE

/**
 * The one page-title treatment for the app: an icon tile that says where you
 * are, the page name, an optional one-line summary, and room for page actions.
 * Icons never replace the title; they only make the route easier to scan.
 */
export function PageHeading({
  icon: Icon,
  title,
  description,
  tone = 'green',
  meta,
  actions,
  className,
}: {
  icon: PageIcon
  title: string
  description?: string
  tone?: PageHeadingTone
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  useDocumentTitle(title)

  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          className={cn(
            'mt-0.5 grid size-12 shrink-0 place-items-center rounded-2xl shadow-soft',
            TONE[tone],
          )}
        >
          <Icon className="size-6" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-800 text-ink sm:text-[30px]">{title}</h1>
            {meta}
          </div>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-[13px] font-500 leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
