'use client'

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/back-button'
import { PageHeading } from '@/components/page-heading'
import { InfoIcon, MailIcon, SendIcon } from 'lucide-react'
import { useToast } from '@/state/ToastContext'

interface FormErrors {
  name: boolean
  replyTo: boolean
  message: boolean
}

const EMPTY_ERRORS: FormErrors = { name: false, replyTo: false, message: false }

export function Contact() {
  const { t } = useTranslation()
  const { success } = useToast()
  const [name, setName] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: FormErrors = {
      name: name.trim() === '',
      replyTo: replyTo.trim() === '',
      message: message.trim() === '',
    }
    setErrors(next)
    if (next.name || next.replyTo || next.message) return
    success(t('contact.sent'))
    setName('')
    setReplyTo('')
    setMessage('')
    setErrors(EMPTY_ERRORS)
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <BackButton to="/help" className="-ml-2 self-start" />

        <PageHeading
          className="mt-4"
          icon={MailIcon}
          title={t('contact.title')}
          description={t('contact.subtitle')}
        />

        <Card className="mt-8">
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('contact.name')}</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={errors.name || undefined}
                autoComplete="name"
              />
              <FieldError>{errors.name ? t('contact.required') : null}</FieldError>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('contact.replyTo')}</FieldLabel>
              <Input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                aria-invalid={errors.replyTo || undefined}
              />
              <FieldError>{errors.replyTo ? t('contact.required') : null}</FieldError>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel className="text-[13px] font-700">{t('contact.message')}</FieldLabel>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={errors.message || undefined}
                rows={5}
              />
              <FieldError>{errors.message ? t('contact.required') : null}</FieldError>
            </Field>

            <p
              role="note"
              className="flex items-start gap-2 rounded-2xl border border-pending/30 bg-pending-bg px-4 py-3 text-[13px] font-700 text-pending"
            >
              <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('contact.disabledNote')}
            </p>

            <Button type="submit" size="lg" className="w-full">
              <SendIcon className="size-[18px]" aria-hidden="true" />
              {t('contact.submit')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
