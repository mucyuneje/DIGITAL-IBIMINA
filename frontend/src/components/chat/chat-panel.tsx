'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon, XIcon } from 'lucide-react'
import { cn } from 'cn'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { MemberAvatar } from '@/components/member-avatar'
import { ChatIcon, CheckIcon } from '@/components/icons'
import { currentLanguage } from '@/i18n'
import { formatDate, formatRelative } from '@shared/money'

/**
 * The group chat, used both in the Bulletin side panel and in the desktop
 * floating launcher. Keeping one component means the message rules, scroll
 * behaviour and composer shortcuts cannot drift between the two placements.
 */
export function ChatPanel({
  variant = 'sidebar',
  onClose,
  className,
}: {
  variant?: 'sidebar' | 'floating'
  onClose?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { chatMessages, loading, call } = useData()
  const language = currentLanguage()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const floating = variant === 'floating'

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chatMessages])

  const send = async () => {
    if (!session || !text.trim() || sending) return
    const body = text.trim()
    setText('')
    setSending(true)
    try {
      await call('postMessage', {
        groupId: session.groupId,
        memberId: session.memberId,
        text: body,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-card',
        floating
          ? 'w-full'
          : 'max-h-[70vh] rounded-card border border-line p-5 shadow-xs lg:max-h-[calc(100dvh-13rem)]',
        className,
      )}
    >
      {floating ? (
        <div className="relative overflow-hidden bg-green px-4 py-3.5 text-white">
          <span
            className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full bg-gold/15"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">
              <ChatIcon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[14px] font-800">{t('bulletin.chat')}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-600 text-white/55">
                <span className="size-1.5 animate-pulse rounded-full bg-gold" />
                {t('bulletin.live')}
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={onClose}
                className="grid size-8 shrink-0 place-items-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-success-bg text-success">
              <ChatIcon className="size-4" />
            </span>
            <h2 className="text-[16px] font-800">{t('bulletin.chat')}</h2>
          </div>
          <p className="mt-1 text-[11px] font-500 text-muted">{t('bulletin.appendOnly')}</p>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-y-auto',
          floating ? 'bg-bg/60 px-3.5 py-4' : 'pb-4 pt-3',
        )}
      >
        {floating ? (
          <span
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(27,67,50,0.08)_1px,transparent_0)] [background-size:18px_18px]"
            aria-hidden="true"
          />
        ) : null}

        <div className="relative">
          {loading.chatMessages && chatMessages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-center gap-2 py-2 text-muted">
                <Spinner className="size-4 text-green" />
                <span className="text-[10px] font-700 uppercase tracking-wide">
                  {t('common.loading')}
                </span>
              </div>
              <Skeleton className="ml-auto h-14 w-2/3 rounded-2xl" />
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-success-bg text-success">
                <ChatIcon className="size-6" />
              </span>
              <div>
                <p className="text-[14px] font-800 text-ink">{t('bulletin.emptyChat')}</p>
                <p className="mt-1 text-[11px] font-500 leading-relaxed text-muted">
                  {t('bulletin.appendOnly')}
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {chatMessages.map((message, index) => {
                const mine = message.senderId === session?.memberId
                const day = formatDate(message.createdAt, language)
                const previous = index > 0 ? chatMessages[index - 1] : null
                const showDay =
                  !previous || formatDate(previous.createdAt, language) !== day
                return (
                  <li key={message.id} className="animate-rise">
                    {showDay ? (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-px flex-1 bg-line/80" />
                        <span className="text-[9px] font-800 uppercase tracking-[0.12em] text-muted">
                          {day}
                        </span>
                        <span className="h-px flex-1 bg-line/80" />
                      </div>
                    ) : null}
                    <div className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
                      <MemberAvatar
                        name={message.senderName}
                        size="sm"
                        className="mt-auto shrink-0"
                      />
                      <div
                        className={cn(
                          'flex min-w-0 max-w-[82%] flex-col',
                          mine ? 'items-end' : 'items-start',
                        )}
                      >
                        {!mine ? (
                          <p className="mb-1 px-1 text-[10px] font-700 text-muted">
                            {message.senderName} · {t(`roles.${message.senderRole}`)}
                          </p>
                        ) : null}
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-[13px] font-500 leading-relaxed shadow-xs',
                            mine
                              ? 'rounded-br-md bg-green text-white'
                              : 'rounded-bl-md border border-line bg-card text-ink',
                          )}
                        >
                          {message.text}
                        </div>
                        <p
                          className={cn(
                            'mt-1 flex items-center gap-1 px-1 text-[9px] font-600 text-muted',
                            mine && 'justify-end',
                          )}
                        >
                          {formatRelative(message.createdAt, language)}
                          {mine ? <CheckIcon className="size-3 text-success" /> : null}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <form
        className={cn(
          'shrink-0 border-t border-line',
          floating ? 'bg-card px-3 py-3' : 'pt-3',
        )}
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('bulletinUi.chatPlaceholder')}
            aria-label={t('bulletinUi.chatPlaceholder')}
            autoFocus={floating}
            className="max-h-28 min-h-10 flex-1 resize-none rounded-xl py-2.5 text-[13px]"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
          />
          <Button
            type="submit"
            size="icon-lg"
            aria-label={t('bulletin.send')}
            disabled={sending || !text.trim()}
            className="size-10 shrink-0 rounded-xl bg-green text-white hover:bg-green-lift"
          >
            {sending ? <Spinner className="size-4" /> : <SendIcon className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
