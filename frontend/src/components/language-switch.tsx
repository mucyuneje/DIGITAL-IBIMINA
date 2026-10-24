'use client'

/**
 * Compact RW · EN · FR segmented control (pitch book, R15).
 *
 * The choice is a per-device preference: it is written to localStorage by
 * `setLanguage` and re-applied on the next visit.
 */
import { useTranslation } from 'react-i18next'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LANGUAGES, currentLanguage, setLanguage } from '@/i18n'
import type { Language } from '@shared/schema'

export function LanguageSwitch({
  tone = 'light',
  size = 'default',
  className = '',
}: {
  tone?: 'light' | 'dark'
  size?: 'default' | 'tiny'
  className?: string
}) {
  const { t } = useTranslation()
  const active = currentLanguage()
  const dark = tone === 'dark'
  const tiny = size === 'tiny'

  const itemClass = tiny
    ? dark
      ? 'h-11 min-w-11 sm:h-6 sm:min-w-7 border-0 px-1 text-[10px] font-700 text-white/55 hover:bg-white/10 hover:text-white aria-pressed:bg-white/20 aria-pressed:text-white'
      : 'h-11 min-w-11 sm:h-6 sm:min-w-7 border-0 px-1 text-[10px] font-700 text-muted hover:text-ink aria-pressed:bg-green aria-pressed:text-white'
    : dark
      ? 'h-11 min-w-11 sm:h-7 sm:min-w-9 border-white/20 px-2 text-[11px] font-700 text-white/70 hover:bg-white/10 hover:text-white aria-pressed:bg-white/20 aria-pressed:text-white'
      : 'h-11 min-w-11 sm:h-7 sm:min-w-9 border-line px-2 text-[11px] font-700 text-muted hover:text-ink aria-pressed:bg-green aria-pressed:text-white'

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[active]}
      onValueChange={(next) => {
        const code = next[0] as Language | undefined
        if (code && code !== active) setLanguage(code)
      }}
      aria-label={t('welcome.language')}
      className={`gap-0.5 ${tiny ? 'bg-transparent' : ''} ${className}`}
    >
      {LANGUAGES.map((language) => (
        <ToggleGroupItem
          key={language.code}
          value={language.code}
          aria-label={language.label}
          className={itemClass}
        >
          {language.code.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
