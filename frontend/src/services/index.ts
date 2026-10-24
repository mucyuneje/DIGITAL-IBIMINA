/**
 * Layer selection. Screens consume `useData()` / `useAuth()`; only this file
 * knows whether the backend is Firebase or the in-browser demo store.
 */
import { dataMode } from '@/config'
import { demoAuth, demoData } from './demo'
import { getFirebaseAuth, getFirebaseData } from './firestore'
import type { AuthLayer, DataLayer } from './types'

export const dataLayer: DataLayer = dataMode === 'firebase' ? getFirebaseData() : demoData
export const authLayer: AuthLayer = dataMode === 'firebase' ? getFirebaseAuth() : demoAuth

export { dataMode }
export type * from './types'
