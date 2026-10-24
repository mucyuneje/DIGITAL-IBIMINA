'use client'

import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { PageHeading, type PageIcon } from '@/components/page-heading'
import { ChatIcon, SearchIcon } from '@/components/icons'
import {
  AccessibilityIcon,
  ChevronRightIcon,
  EyeIcon,
  InfoIcon,
  LandmarkIcon,
  LifeBuoyIcon,
  PhoneIcon,
  ScaleIcon,
  ShieldIcon,
  UserCheckIcon,
} from 'lucide-react'

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const

const LEGAL_LINKS: { to: string; key: string; icon: PageIcon }[] = [
  { to: '/terms', key: 'terms.title', icon: ScaleIcon },
  { to: '/privacy', key: 'privacy.title', icon: ShieldIcon },
  { to: '/privacy/rights', key: 'rights.title', icon: UserCheckIcon },
  { to: '/disclosure', key: 'disclosure.title', icon: EyeIcon },
  { to: '/regulatory', key: 'regulatory.title', icon: LandmarkIcon },
  { to: '/accessibility', key: 'accessibility.title', icon: AccessibilityIcon },
  { to: '/about', key: 'about.title', icon: InfoIcon },
]

export function Help() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState<number[]>([])

  const entries = useMemo(
    () =>
      FAQ_IDS.map((n) => ({
        n,
        question: t(`help.q${n}`),
        answer: t(`help.a${n}`),
      })),
    [t],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (entry) =>
        entry.question.toLowerCase().includes(q) || entry.answer.toLowerCase().includes(q),
    )
  }, [entries, query])

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        icon={LifeBuoyIcon}
        title={t('help.title')}
        description={t('help.subtitle')}
      />

      <InputGroup>
        <InputGroupAddon align="inline-start">
          <SearchIcon className="size-4 text-muted" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('help.search')}
          aria-label={t('help.search')}
        />
      </InputGroup>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-[15px]">{t('help.noResults')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Accordion
          value={openIds}
          onValueChange={(value) => setOpenIds(value as number[])}
        >
          {filtered.map((entry) => (
            <AccordionItem key={entry.n} value={entry.n} className="border-line">
              <AccordionTrigger className="w-full justify-between py-3.5 text-left text-[14px] font-700 text-ink hover:no-underline">
                {entry.question}
              </AccordionTrigger>
              <AccordionContent className="text-[13px] font-500 leading-relaxed text-muted">
                {entry.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Card>
        <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
          <ChatIcon className="size-[18px] text-green" aria-hidden="true" />
          {t('help.contactTitle')}
        </h2>
        <p className="text-[13px] font-500 text-muted">{t('help.contactBody')}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ink/[0.03] px-4 py-3">
          <span className="flex items-center gap-1.5 text-[12px] font-700 uppercase tracking-wide text-muted">
            <PhoneIcon className="size-3.5" aria-hidden="true" />
            {t('help.supportLabel')}
          </span>
          <span className="text-[14px] font-800 text-ink">{t('help.supportValue')}</span>
        </div>
        <div>
          <Button variant="outline" onClick={() => navigate('/contact')}>
            <ChatIcon className="size-[18px]" />
            {t('help.contactAction')}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-[17px] font-800 text-ink">
          <ScaleIcon className="size-[18px] text-green" aria-hidden="true" />
          {t('help.legalTitle')}
        </h2>
        <ul className="grid gap-1.5">
          {LEGAL_LINKS.map((entry) => {
            const LinkIcon = entry.icon
            return (
              <li key={entry.to}>
                <Link
                  to={entry.to}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-700 text-ink transition-colors hover:bg-muted"
                >
                  <LinkIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{t(entry.key)}</span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
