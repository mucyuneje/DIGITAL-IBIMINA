import type { TFunction } from 'i18next'

/**
 * Every backend failure becomes an i18n key. No raw error text ever reaches
 * the screen, and no stack trace is ever shown to a member.
 */
export function errorKeyFrom(error: unknown): string {
  if (typeof error === 'string') return error
  const message = (error as { message?: string })?.message ?? ''
  if (message.startsWith('errors:')) return message.slice('errors:'.length)

  const code = (error as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-verification-code':
    case 'auth/code-expired':
    case 'auth/invalid-phone-number':
      return 'errors.otpIncorrect'
    case 'auth/too-many-requests':
      return 'errors.network'
    case 'functions/permission-denied':
      return 'states.permission'
    case 'functions/unauthenticated':
      return 'errors.sessionExpired'
    case 'unavailable':
    case 'functions/unavailable':
      return 'errors.network'
    default:
      break
  }
  return 'errors.generic'
}

export function translateError(t: TFunction, error: unknown): string {
  return t(errorKeyFrom(error))
}
