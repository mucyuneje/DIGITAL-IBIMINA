'use client'

import type { ComponentProps } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { useFieldControlId } from '@/components/ui/field'
import { RwandaFlag } from '@/components/icons'
import {
  formatRwandanNational,
  formatRwandanPhone,
  maskRwandanPhone,
  rwandanNationalNumber,
} from '@shared/schema'

type PhoneInputProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'onChange' | 'inputMode'
> & {
  /** National digits (or any accepted phone shape) held by the form. */
  value: string
  onValueChange: (national: string) => void
  invalid?: boolean
  groupClassName?: string
}

/**
 * One phone input for the whole app: Rwandan flag, fixed +250 country code,
 * and a national 9-digit number that auto-groups as 788 123 456. The value
 * handed back to the form is always plain national digits; call
 * `normalizePhone` only at the submit boundary.
 */
export function PhoneNumberField({
  value,
  onValueChange,
  invalid,
  groupClassName,
  className,
  id,
  placeholder = '788 123 456',
  autoComplete = 'tel-national',
  ...props
}: PhoneInputProps) {
  const fieldId = useFieldControlId()

  return (
    <InputGroup
      className={[
        'rounded-xl bg-card',
        invalid ? 'border-danger' : 'border-line',
        groupClassName ?? 'h-11',
      ].join(' ')}
    >
      <InputGroupAddon
        align="inline-start"
        className="h-full gap-1.5 border-r border-line pr-2.5"
      >
        <RwandaFlag className="h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-ink/10" />
        <InputGroupText className="text-[13px] font-800 text-ink">+250</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        {...props}
        id={id ?? fieldId ?? undefined}
        type="tel"
        value={formatRwandanNational(value)}
        onChange={(event) => onValueChange(rwandanNationalNumber(event.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete={autoComplete}
        aria-invalid={invalid || props['aria-invalid'] || undefined}
        spellCheck={false}
        className={[
          'text-[15px] font-700 tabular-nums tracking-[0.01em]',
          invalid ? 'text-danger' : '',
          className ?? '',
        ].join(' ')}
      />
    </InputGroup>
  )
}

/**
 * Read-only phone display. Officers see the full number; ordinary members
 * pass `masked` so only the prefix and last three digits are shown.
 */
export function PhoneNumber({
  phone,
  masked = false,
  withFlag = false,
  className,
  flagClassName,
}: {
  phone: string | null | undefined
  masked?: boolean
  withFlag?: boolean
  className?: string
  flagClassName?: string
}) {
  const text = masked ? maskRwandanPhone(phone ?? '') : formatRwandanPhone(phone ?? '')
  if (!text) return <span className={className}>—</span>

  return (
    <span
      className={['inline-flex min-w-0 items-center gap-1.5', className ?? ''].join(' ')}
      dir="ltr"
    >
      {withFlag ? (
        <RwandaFlag
          className={[
            'h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-ink/10',
            flagClassName ?? '',
          ].join(' ')}
        />
      ) : null}
      <span className="truncate" title={text}>
        {text}
      </span>
    </span>
  )
}
