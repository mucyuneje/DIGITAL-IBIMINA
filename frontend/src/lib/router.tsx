'use client'

/**
 * react-router-compatible API implemented over the Next.js App Router.
 *
 * Screens ported from the Vite app import from `@/lib/router` instead of
 * `react-router-dom`; their `to`-prop Links, navigate() calls, params and
 * location reads keep working unchanged. This is routing plumbing, not UI —
 * all visual components come from shadcn/ui.
 */
import NextLink from 'next/link'
import {
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
  useRouter,
  useParams as useNextParams,
} from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'

export interface NavigateOptions {
  replace?: boolean
}

export function Link({
  to,
  children,
  ...rest
}: { to: string; children?: ReactNode } & Omit<
  React.ComponentProps<typeof NextLink>,
  'href'
>) {
  return (
    <NextLink href={to} {...rest}>
      {children}
    </NextLink>
  )
}

/** react-router style navigation: navigate('/path'), navigate(-1) to go back. */
export function useNavigate() {
  const router = useRouter()
  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        router.back()
        return
      }
      if (options?.replace) router.replace(to)
      else router.push(to)
    },
    [router],
  )
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useNextParams() as T
}

export interface Location {
  pathname: string
  search: string
  hash: string
}

export function useLocation(): Location {
  const pathname = useNextPathname()
  return { pathname, search: '', hash: '' }
}

/**
 * react-router returns a [params, setParams] tuple. Screens only read
 * (`const [params] = useSearchParams()`); writes go through the router.
 */
export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | string, options?: NavigateOptions) => void,
] {
  const searchParams = useNextSearchParams()
  const router = useRouter()
  const pathname = useNextPathname()

  const setSearchParams = useCallback(
    (
      next: URLSearchParams | string,
      options?: NavigateOptions,
    ) => {
      const qs =
        typeof next === 'string'
          ? next.replace(/^\?/, '')
          : next.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      if (options?.replace) router.replace(url)
      else router.push(url)
    },
    [pathname, router],
  )

  return [searchParams, setSearchParams]
}

/** Declarative redirect, same semantics as react-router's <Navigate>. */
export function Navigate({
  to,
  replace = false,
}: {
  to: string
  replace?: boolean
}) {
  const router = useRouter()

  useEffect(() => {
    if (replace) router.replace(to)
    else router.push(to)
  }, [router, to, replace])

  return null
}
