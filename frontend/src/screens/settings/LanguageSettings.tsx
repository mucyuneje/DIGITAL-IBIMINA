'use client'

import { useTranslation } from 'react-i18next'
import { CheckIcon, LanguagesIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SettingsPageHeader } from '@/components/settings-page-header'
import { LANGUAGES, currentLanguage, setLanguage } from '@/i18n'
import type { Language } from '@shared/schema'

export function SettingsLanguage() {
  const { t } = useTranslation()
  const active = currentLanguage()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsPageHeader
        icon={LanguagesIcon}
        tone="gold"
        title={t('language.title')}
        subtitle={t('settingsIndex.languageHint')}
      />

      <Card>
        <div className="flex items-start gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-pending">
            <LanguagesIcon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-800 text-ink">{t('welcome.language')}</h2>
            <p className="mt-0.5 text-[12px] font-500 leading-relaxed text-muted">
              {t('language.note')}
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label={t('welcome.language')}
          className="mt-4 grid gap-2 sm:grid-cols-3"
        >
          {LANGUAGES.map((language) => {
            const selected = active === language.code
            return (
              <button
                key={language.code}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setLanguage(language.code as Language)}
                className={[
                  'flex min-h-[68px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-green/20',
                  selected
                    ? 'border-green bg-success-bg/60 shadow-xs'
                    : 'border-line bg-card hover:border-green/35 hover:bg-bg',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-800 uppercase tracking-wide',
                    selected ? 'bg-green text-gold' : 'bg-bg text-muted',
                  ].join(' ')}
                >
                  {language.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-800 text-ink">
                    {language.native}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-500 text-muted">
                    {language.code.toUpperCase()}
                  </span>
                </span>
                {selected ? (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-green text-white">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
