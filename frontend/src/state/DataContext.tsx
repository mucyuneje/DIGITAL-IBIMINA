import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { dataLayer, dataMode } from '@/services'
import type {
  ActionName,
  ActionPayload,
  ActionReturns,
  CollectionKey,
} from '@/services/types'
import { useAuth } from './AuthContext'
import type {
  AnnouncementDoc,
  AuditLogDoc,
  ChatMessageDoc,
  GroupDoc,
  LoanDoc,
  MemberDoc,
  PetitionDoc,
} from '@shared/schema'

export interface GroupData {
  group: GroupDoc | null
  members: MemberDoc[]
  petitions: PetitionDoc[]
  announcements: AnnouncementDoc[]
  chatMessages: ChatMessageDoc[]
  loans: LoanDoc[]
  auditLogs: AuditLogDoc[]
}

export type LoadingMap = Record<CollectionKey, boolean>

export interface DataContextValue extends GroupData {
  mode: 'demo' | 'firebase'
  loading: LoadingMap
  error: CollectionKey | null
  offline: boolean
  /** Live listener is attached and the group document has arrived. */
  ready: boolean
  call<K extends ActionName>(
    action: K,
    payload: ActionPayload[K],
    plan?: OptimisticPlan,
  ): Promise<ActionReturns[K]>
  dismissError(): void
}

export interface OptimisticPlan {
  keys: CollectionKey[]
  patch: (current: DataContextValue) => Partial<GroupData>
}

const EMPTY: GroupData = {
  group: null,
  members: [],
  petitions: [],
  announcements: [],
  chatMessages: [],
  loans: [],
  auditLogs: [],
}

const ALL_LOADING: LoadingMap = {
  group: true,
  members: true,
  petitions: true,
  announcements: true,
  chatMessages: true,
  loans: true,
  auditLogs: true,
}

const DataContext = createContext<DataContextValue | null>(null)

const OPTIMISTIC_TIMEOUT_MS = 10_000

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const groupId = session?.groupId ?? null
  const memberId = session?.memberId ?? null
  /** The active membership — switching groups re-binds every listener (R59). */
  const scope = groupId && memberId ? `${groupId}:${memberId}` : null

  const [data, setData] = useState<GroupData>(EMPTY)
  const [overrides, setOverrides] = useState<Partial<GroupData>>({})
  const [loading, setLoading] = useState<LoadingMap>(ALL_LOADING)
  const [error, setError] = useState<CollectionKey | null>(null)
  const [offline, setOffline] = useState(
    typeof navigator === 'undefined' ? false : !navigator.onLine,
  )
  const watchdog = useRef<number | null>(null)

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  /** A fresh snapshot for a collection always wins over an optimistic patch. */
  const settle = useCallback((key: CollectionKey) => {
    setOverrides((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    setLoading((prev) => (prev[key] ? { ...prev, [key]: false } : prev))
  }, [])

  /**
   * Reset when the bound membership changes — adjusted during render (React's
   * "adjust state when props change" pattern), not inside an effect
   * (react-hooks/set-state-in-effect).
   */
  const [activeScope, setActiveScope] = useState<string | null>(scope)
  if (scope !== activeScope) {
    setActiveScope(scope)
    setData(EMPTY)
    setOverrides({})
    setLoading(ALL_LOADING)
    setError(null)
  }

  useEffect(() => {
    if (!groupId) return

    const unsubscribe = dataLayer.subscribeGroup(groupId, {
      group: (group) => {
        setData((prev) => ({ ...prev, group }))
        settle('group')
      },
      members: (members) => {
        setData((prev) => ({ ...prev, members }))
        settle('members')
      },
      petitions: (petitions) => {
        setData((prev) => ({ ...prev, petitions }))
        settle('petitions')
      },
      announcements: (announcements) => {
        setData((prev) => ({ ...prev, announcements }))
        settle('announcements')
      },
      chatMessages: (chatMessages) => {
        setData((prev) => ({ ...prev, chatMessages }))
        settle('chatMessages')
      },
      loans: (loans) => {
        setData((prev) => ({ ...prev, loans }))
        settle('loans')
      },
      auditLogs: (auditLogs) => {
        setData((prev) => ({ ...prev, auditLogs }))
        settle('auditLogs')
      },
      error: (key) => {
        setError(key)
        settle(key)
      },
    })

    return unsubscribe
  }, [groupId, memberId, settle])

  const call = useCallback(
    async <K extends ActionName>(
      action: K,
      payload: ActionPayload[K],
      plan?: OptimisticPlan,
    ): Promise<ActionReturns[K]> => {
      const clearPlan = () => {
        if (!plan) return
        setOverrides((prev) => {
          const next = { ...prev }
          for (const key of plan.keys) delete next[key]
          return next
        })
      }

      if (plan) {
        const projected = plan.patch({ ...EMPTY, ...data, ...overrides } as DataContextValue)
        setOverrides((prev) => ({ ...prev, ...projected }))
        if (watchdog.current) window.clearTimeout(watchdog.current)
        watchdog.current = window.setTimeout(clearPlan, OPTIMISTIC_TIMEOUT_MS)
      }

      try {
        const result = await dataLayer.call(action, payload)
        // Roll the optimistic state back on failure — never leave the user
        // looking at a number that isn't real.
        if (!result.ok) clearPlan()
        return result
      } catch (cause) {
        clearPlan()
        throw cause
      }
    },
    [data, overrides],
  )

  const merged = useMemo<DataContextValue>(
    () => ({
      ...EMPTY,
      ...data,
      ...overrides,
      mode: dataMode,
      loading,
      error,
      offline,
      ready: !loading.group && Boolean(data.group ?? overrides.group),
      call,
      dismissError: () => setError(null),
    }),
    [data, overrides, loading, error, offline, call],
  )

  return <DataContext.Provider value={merged}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
