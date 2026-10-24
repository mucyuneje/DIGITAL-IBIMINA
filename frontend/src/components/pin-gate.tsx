'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, DeleteIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PIN_LENGTH } from '@shared/schema'

export interface PinGateResult {
  ok: boolean
  errorKey?: string
}

/**
 * Every sensitive action re-requires the PIN (vote, deposit, loan, repayment,
 * announcement). The PIN never leaves this component unhashed.
 * Composed entirely from shadcn/ui primitives.
 */
export function PinGateModal({
  open,
  onClose,
  title,
  note,
  submitLabel,
  onSubmit,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  note?: ReactNode
  submitLabel?: ReactNode
  onSubmit: (pin: string) => Promise<PinGateResult>
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  const reset = useCallback(() => {
    setPin('')
    setError(null)
    setInvalid(false)
  }, [])

  const submit = useCallback(
    async (override?: string) => {
      const candidate = override ?? pin
      if (candidate.length !== PIN_LENGTH) {
        setError(t('auth.pinInvalid'))
        setInvalid(true)
        return
      }
      setBusy(true)
      setError(null)
      try {
        const result = await onSubmit(candidate)
        if (!result.ok) {
          setError(result.errorKey ? t(result.errorKey) : t('errors.pinIncorrect'))
          setInvalid(true)
          setPin('')
        } else {
          reset()
          onClose()
        }
      } finally {
        setBusy(false)
      }
    },
    [pin, onSubmit, onClose, reset, t],
  )

  const pushDigit = useCallback(
    (digit: string) => {
      if (busy || pin.length >= PIN_LENGTH) return
      const next = pin + digit
      setPin(next)
      if (error) setError(null)
      // Auto-submit on the fifth digit, matching the pitch mockup. The visible
      // spinner on the confirm button makes the submission obvious.
      if (next.length === PIN_LENGTH) void submit(next)
    },
    [busy, error, pin, submit],
  )

  const removeDigit = useCallback(() => {
    if (busy) return
    setPin(pin.slice(0, -1))
    if (error) setError(null)
  }, [busy, error, pin])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? t('desk.pinGate')}</DialogTitle>
          <DialogDescription>{note ?? t('desk.pinGateNote')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {children}
          <div className="flex flex-col items-center gap-4">
            {/* Hidden input keeps the physical keyboard working; the visible
                dots and the keypad both drive the same 5-digit value. */}
            <input
              value=""
              onChange={(event) => {
                const digit = event.target.value.replace(/\D/g, '').slice(-1)
                if (digit) pushDigit(digit)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace') {
                  event.preventDefault()
                  removeDigit()
                }
              }}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              disabled={busy}
              aria-label={t('auth.pinTitle')}
              aria-invalid={invalid || undefined}
              className="sr-only"
            />

            <div
              className="flex items-center justify-center gap-3"
              aria-hidden="true"
            >
              {Array.from({ length: PIN_LENGTH }, (_, index) => (
                <span
                  key={index}
                  className={[
                    'size-3.5 rounded-full transition-colors',
                    index < pin.length ? 'bg-green' : 'bg-ink/15',
                  ].join(' ')}
                />
              ))}
            </div>

            {error ? (
              <p role="alert" className="-mt-1 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {/* The 3×4 keypad of the pitch mockup (R20). The 5th digit still
                auto-submits; the spinner below makes that visible. */}
            <PinKeypad
              disabled={busy}
              onDigit={pushDigit}
              onDelete={removeDigit}
              onConfirm={() => void submit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              reset()
              onClose()
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="default"
            className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
            disabled={busy || pin.length !== PIN_LENGTH}
            onClick={() => void submit()}
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-ink/25 border-t-ink" />
            ) : null}
            {busy ? t('common.working') : submitLabel ?? t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The PIN keypad of the pitch mockup (R20): 1–9, delete, 0, confirm.
 *
 * Every key is a real button, so the whole PIN can be entered with a
 * keyboard, a mouse or a thumb. The digits only update the slot input; the
 * auto-submit on the fifth digit stays where it was — on the OTP input's
 * `onComplete`.
 */
function PinKeypad({
  disabled,
  onDigit,
  onDelete,
  onConfirm,
}: {
  disabled?: boolean
  onDigit: (digit: string) => void
  onDelete: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div role="group" aria-label={t('auth.pinKeypad')} className="grid grid-cols-3 gap-2">
      {digits.map((digit) => (
        <PinKey
          key={digit}
          label={digit}
          onClick={() => onDigit(digit)}
          disabled={disabled}
          className="text-[18px] font-800"
        />
      ))}
      <PinKey
        label={t('auth.pinDelete')}
        onClick={onDelete}
        disabled={disabled}
        icon={<DeleteIcon className="size-5" />}
      />
      <PinKey
        label="0"
        onClick={() => onDigit('0')}
        disabled={disabled}
        className="text-[18px] font-800"
      />
      <PinKey
        label={t('common.confirm')}
        onClick={onConfirm}
        disabled={disabled}
        icon={<CheckIcon className="size-5" />}
        className="bg-gold text-ink hover:bg-gold-deep hover:text-white"
      />
    </div>
  )
}

function PinKey({
  label,
  onClick,
  disabled,
  icon,
  className = '',
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  icon?: ReactNode
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={['h-14 w-full', className].join(' ')}
    >
      {icon ?? label}
    </Button>
  )
}
