'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { LANGUAGES, currentLanguage, setLanguage } from '@/i18n'
import { LockIcon, ShieldIcon, UsersIcon } from '@/components/icons'
import { useDocumentTitle } from '@/lib/use-document-title'

/** Shared chrome for every pre-authentication screen. */
export function WelcomeLayout({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
}) {
  const { t } = useTranslation()
  const active = currentLanguage()

  useDocumentTitle(title)

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — the vault is the product, so it leads. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-green p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-gold/[0.07]" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gold text-ink">
              <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
                <path
                  d="M6 16.5c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[20px] font-800">{t('common.appName')}</p>
          </div>

          <h1 className="animate-rise mt-14 max-w-md text-[40px] leading-[1.08] font-800">
            {t('welcome.tagline')}
          </h1>
          <p className="animate-rise mt-4 max-w-sm text-[15px] font-500 leading-relaxed text-white/70">
            {t('welcome.subline')}
          </p>
        </div>

        <div className="animate-rise relative rounded-card border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[13px] font-700 text-gold">
            <ShieldIcon className="size-4" />
            {t('welcome.trust')}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/10 px-2.5 py-1 text-[12px] font-700">
              <LockIcon className="size-3.5" /> {t('welcome.trustMultiSign')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/10 px-2.5 py-1 text-[12px] font-700">
              <UsersIcon className="size-3.5" /> {t('welcome.trustMemberVote')}
            </span>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex flex-col bg-bg">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-green text-gold">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M6 16.5c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <span className="text-[16px] font-800">{t('common.appName')}</span>
          </div>
          <div className="ml-auto">
            <div className="flex gap-1 rounded-chip bg-ink/[0.05] p-1">
              {LANGUAGES.map((language) => {
                const isActive = language.code === active
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => setLanguage(language.code)}
                    aria-pressed={isActive}
                    className={[
                      'relative min-h-9 rounded-chip px-3 text-[13px] font-700',
                      'transition-colors duration-150',
                      isActive ? 'text-white' : 'text-muted hover:text-ink',
                    ].join(' ')}
                  >
                    {isActive ? (
                      <span className="absolute inset-0 rounded-chip bg-green" />
                    ) : null}
                    <span className="relative z-10">{language.code.toUpperCase()}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className={`animate-rise w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
            <h2 className="text-[26px] font-800 text-ink">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-[14px] font-500 leading-relaxed text-muted">{subtitle}</p>
            ) : null}
            <div className="mt-7">{children}</div>
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <Badge variant="outline">{t('common.tagline')}</Badge>
        </div>
      </section>
    </div>
  )
}
