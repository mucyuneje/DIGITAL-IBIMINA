import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { BackButton } from '@/components/back-button'
import { PageHeading, type PageHeadingTone } from '@/components/page-heading'

/**
 * Shared header for every settings sub-page: one back affordance, an icon
 * tile that says where you are, and room for a page-level action.
 */
export function SettingsPageHeader({
  icon: Icon,
  title,
  subtitle,
  tone = 'green',
  actions,
  className,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  tone?: PageHeadingTone
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <BackButton to="/settings" className="-ml-2 self-start" />
      <PageHeading
        icon={Icon}
        title={title}
        description={subtitle}
        tone={tone}
        actions={actions}
      />
    </div>
  )
}
