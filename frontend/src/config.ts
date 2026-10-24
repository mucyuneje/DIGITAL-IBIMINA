/**
 * Environment + runtime mode.
 *
 * The app runs in "demo" mode (in-browser, no backend) until real Firebase
 * values are placed in `.env.local`. Nothing here ever assumes a project exists.
 */
/**
 * `process.env.NEXT_PUBLIC_*` is inlined by Next as a string literal at build
 * time. Reading the fields directly (never through a `const env = process.env`
 * alias) keeps `dataMode` a fully-foldable constant, so the bundler can drop
 * the entire Firebase layer from a demo build.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'

/**
 * TEMPORARY (development): skip the phone-OTP + PIN login and auto-sign-in as
 * a seeded demo member so the app screens can be worked on directly.
 * Set `NEXT_PUBLIC_BYPASS_AUTH=false` to restore the real authentication flow.
 */
export const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

export type DataMode = 'firebase' | 'demo'

/** Demo mode wins until a Firebase project is actually wired in. */
export const dataMode: DataMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  !(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  )
    ? 'demo'
    : 'firebase'

export const APP_DEFAULT_TITLE = 'Ibimina — Community Banking'

export const DEMO_OTP = '123456'

export const SESSION_STORAGE_KEY = 'ibimina.session'
export const SESSION_IDLE_MS = 20 * 60 * 1000
