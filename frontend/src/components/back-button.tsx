'use client'

import { useNavigate } from '@/lib/router'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The single back affordance for every sub-page: a ghost Button with an
 * arrow-left icon. Renders nothing on routes without history to return to
 * only when `to` is unset and the stack is empty — we simply go back.
 */
export function BackButton({ to, className }: { to?: string; className?: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <ArrowLeftIcon className="size-4" />
      {t('action.back')}
    </Button>
  )
}
