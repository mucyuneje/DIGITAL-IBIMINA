/**
 * Firebase client wiring. Imported only when `dataMode === 'firebase'`, so a
 * demo-mode build never needs a real project.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions'
import { firebaseConfig, useEmulators } from '@/config'

let app: FirebaseApp
let auth: Auth
let db: Firestore
let functions: Functions

function ensureInit() {
  if (app) return
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)

  try {
    // Offline persistence matters on patchy rural connectivity.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    db = getFirestore(app)
  }

  functions = getFunctions(app)

  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  }
}

export function firebase() {
  ensureInit()
  return { app, auth, db, functions }
}
