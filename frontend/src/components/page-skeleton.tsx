import { cn } from 'cn'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

/**
 * Route-level loading placeholder for list/detail pages.
 *
 * Rendered by `loading.tsx` while a route segment streams, and reused by
 * detail screens that fetch a single record, so the whole app shows the same
 * shape while data arrives. The spinner sits above the skeleton so it is
 * immediately obvious that the app is working, not frozen.
 */
export function PageSkeleton({
  rows = 4,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('flex w-full flex-col gap-5', className)} aria-busy="true">
      <div className="flex items-center gap-2.5" role="status">
        <span className="grid size-8 place-items-center rounded-lg bg-card shadow-xs ring-1 ring-line">
          <Spinner className="size-4 text-green" />
        </span>
        <Skeleton className="h-3.5 w-24 rounded-md" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-28 rounded-card" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-card" />
        ))}
      </div>
    </div>
  )
}
