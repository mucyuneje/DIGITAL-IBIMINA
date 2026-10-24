'use client'

import { useEffect } from 'react'
import { APP_DEFAULT_TITLE } from '@/config'

/**
 * Keeps the route-specific document title through Next's metadata hydration.
 * The root layout's static title can commit *after* the page content, so one
 * effect is not enough: watch the title for a short window and only re-apply
 * when the root fallback has replaced the page title.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return
    const next = `${title} · Ibimina`
    const apply = () => {
      if (document.title !== next) document.title = next
    }

    apply()
    const frame = window.requestAnimationFrame(apply)
    const timers = [0, 250, 1000].map((delay) => window.setTimeout(apply, delay))
    const observer = new MutationObserver(() => {
      if (document.title === APP_DEFAULT_TITLE) apply()
    })
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    const stopWatching = window.setTimeout(() => observer.disconnect(), 4000)

    return () => {
      window.cancelAnimationFrame(frame)
      for (const timer of timers) window.clearTimeout(timer)
      window.clearTimeout(stopWatching)
      observer.disconnect()
    }
  }, [title])
}
