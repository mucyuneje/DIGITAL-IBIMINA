'use client'

/**
 * Legal + policy pages — STRUCTURE ONLY.
 *
 * These routes render the approved section headings with a DRAFT banner and a
 * placeholder line where the lawyer-reviewed body text will go. No legal
 * sentence, clause, law name, regulator name or obligation is written here, and
 * nothing is loaded from disk. Body copy is supplied by counsel in a later
 * phase; see docs/MISSING-PAGES-SPEC.md and docs/ROUTE-MAP.md.
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@/lib/router'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { PageHeading, type PageIcon } from '@/components/page-heading'
import {
  AccessibilityIcon,
  EyeIcon,
  InfoIcon,
  LandmarkIcon,
  MailIcon,
  ScaleIcon,
  ShieldIcon,
  Trash2Icon,
  UserCheckIcon,
} from 'lucide-react'

export type LegalPageKey =
  | 'terms'
  | 'privacy'
  | 'rights'
  | 'disclosure'
  | 'regulatory'
  | 'accessibility'
  | 'about'

interface LegalPageDef {
  titleKey: string
  headingKeys: string[]
  backTo: string
  icon: PageIcon
}

const PAGES: Record<LegalPageKey, LegalPageDef> = {
  terms: {
    titleKey: 'terms.title',
    headingKeys: [
      'terms.h1',
      'terms.h2',
      'terms.h3',
      'terms.h4',
      'terms.h5',
      'terms.h6',
      'terms.h7',
    ],
    backTo: '/help',
    icon: ScaleIcon,
  },
  privacy: {
    titleKey: 'privacy.title',
    headingKeys: [
      'privacy.h1',
      'privacy.h2',
      'privacy.h3',
      'privacy.h4',
      'privacy.h5',
      'privacy.h6',
      'privacy.h7',
    ],
    backTo: '/help',
    icon: ShieldIcon,
  },
  rights: {
    titleKey: 'rights.title',
    headingKeys: ['rights.h1', 'rights.h2'],
    backTo: '/settings',
    icon: UserCheckIcon,
  },
  disclosure: {
    titleKey: 'disclosure.title',
    headingKeys: ['disclosure.h1', 'disclosure.h2'],
    backTo: '/help',
    icon: EyeIcon,
  },
  regulatory: {
    titleKey: 'regulatory.title',
    headingKeys: ['regulatory.h1', 'regulatory.h2'],
    backTo: '/help',
    icon: LandmarkIcon,
  },
  accessibility: {
    titleKey: 'accessibility.title',
    headingKeys: ['accessibility.h1', 'accessibility.h2', 'accessibility.h3'],
    backTo: '/help',
    icon: AccessibilityIcon,
  },
  about: {
    titleKey: 'about.title',
    headingKeys: ['about.h1'],
    backTo: '/help',
    icon: InfoIcon,
  },
}

/** Fixed at build time: legal drafts are stamped with the build date. */
const BUILD_DATE = new Date()

export function LegalPage({ page }: { page: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const def = PAGES[page as LegalPageKey]
  const updated = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(BUILD_DATE)

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <BackButton to={def.backTo} className="-ml-2 self-start" />

        <p
          role="note"
          className="mt-6 flex items-start gap-2 rounded-2xl border border-pending/30 bg-pending-bg px-4 py-3 text-[13px] font-700 text-pending"
        >
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('legal.draft')}
        </p>

        <PageHeading
          className="mt-6"
          icon={def.icon}
          title={t(def.titleKey)}
          description={t('legal.updated', { date: updated })}
        />

        <div className="mt-8 space-y-7">
          {def.headingKeys.map((key) => (
            <section key={key}>
              <h2 className="text-[17px] font-800 text-ink">{t(key)}</h2>
              {page === 'regulatory' && key === 'regulatory.h2' ? (
                <p className="mt-2 text-[14px] font-700 text-ink">{t('regulatory.licence')}</p>
              ) : null}
              <p className="mt-2 text-[14px] font-500 italic text-muted">{t('legal.pending')}</p>
            </section>
          ))}
        </div>

        {page === 'rights' ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate('/contact')}>
              <MailIcon className="size-4" aria-hidden="true" />
              {t('rights.contact')}
            </Button>
            <Button variant="destructive" onClick={() => navigate('/settings/delete-account')}>
              <Trash2Icon className="size-4" aria-hidden="true" />
              {t('rights.delete')}
            </Button>
          </div>
        ) : null}

        {page === 'accessibility' ? (
          <Button variant="link" className="mt-8" onClick={() => navigate('/contact')}>
            <MailIcon className="size-4" aria-hidden="true" />
            {t('accessibility.contact')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
