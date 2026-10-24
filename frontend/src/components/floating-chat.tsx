'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { ChatIcon } from '@/components/icons'
import { ChatPanel } from '@/components/chat/chat-panel'

/**
 * Desktop-only floating chat. On phones the Bulletin tab already owns the
 * conversation, so adding another fixed launcher would cover the tab bar.
 */
export function FloatingChat() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { chatMessages } = useData()
  const [open, setOpen] = useState(false)
  const storageKey = session
    ? `ibimina.chat.read.${session.memberId}`
    : 'ibimina.chat.read'
  const [lastRead, setLastRead] = useState(() => {
    if (typeof window === 'undefined') return 0
    const stored = Number(window.localStorage.getItem(storageKey))
    return Number.isFinite(stored) ? stored : 0
  })

  const unread = useMemo(
    () =>
      open
        ? 0
        : chatMessages.filter(
            (message) =>
              message.senderId !== session?.memberId && message.createdAt > lastRead,
          ).length,
    [chatMessages, lastRead, open, session?.memberId],
  )

  const markRead = () => {
    const now = Date.now()
    setLastRead(now)
    try {
      window.localStorage.setItem(storageKey, String(now))
    } catch {
      // Private mode may block storage; the in-memory timestamp still works.
    }
  }

  const openChat = () => {
    markRead()
    setOpen(true)
  }

  const closeChat = () => {
    setOpen(false)
    markRead()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      const now = Date.now()
      setLastRead(now)
      try {
        window.localStorage.setItem(storageKey, String(now))
      } catch {
        // Ignore storage failures.
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, storageKey])

  return (
    <div className="hidden lg:block">
      {open ? (
        <div
          id="floating-chat"
          className="fixed bottom-6 right-6 z-50 h-[min(620px,calc(100dvh-8rem))] w-[380px] max-w-[calc(100vw-2rem)] animate-rise overflow-hidden rounded-3xl border border-line bg-card shadow-lift"
        >
          <ChatPanel variant="floating" onClose={closeChat} />
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={false}
          aria-controls="floating-chat"
          onClick={openChat}
          className="group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full border border-white/10 bg-green py-2 pl-2 pr-4 text-white shadow-lift transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-lift focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-gold/50"
        >
          <span className="relative grid size-9 place-items-center rounded-full bg-gold text-ink">
            <ChatIcon className="size-[18px]" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-green bg-danger px-1 text-[9px] font-800 leading-none text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </span>
          <span className="text-[13px] font-800">{t('bulletin.chat')}</span>
        </button>
      )}
    </div>
  )
}
