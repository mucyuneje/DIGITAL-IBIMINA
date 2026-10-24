'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from 'cn'

/** Soft, readable background colours for member initials. */
const SOFT_BG = [
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-indigo-100 text-indigo-800',
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MemberAvatar({
  name,
  size = 'default',
  className,
}: {
  name: string
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className={cn(SOFT_BG[hashName(name) % SOFT_BG.length], 'font-bold')}>
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
