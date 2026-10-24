/**
 * Anomaly flags (strategy report, security item 8).
 *
 * Pure and shared: the Cloud Function and the client-side internal view run
 * exactly the same detection, so the two can never disagree.
 *
 * "One device" is approximated as votes landing on one petition inside a short
 * window, which is what a shared or borrowed phone looks like from the server.
 */
import type { AuditLogDoc, PetitionDoc } from './schema'

export type AnomalyCode = 'largeWithdrawal' | 'rapidVotes'

export interface Anomaly {
  code: AnomalyCode
  severity: 'low' | 'high'
  /** i18n params for `anomaly.*`. */
  params: Record<string, string | number>
  at: number
  refId: string | null
}

export interface AnomalyOptions {
  /** Share of the vault that counts as "unusually large". */
  largeWithdrawalShare?: number
  rapidVoteWindowMs?: number
  rapidVoteThreshold?: number
  now?: number
}

export const ANOMALY_DEFAULTS = {
  largeWithdrawalShare: 0.5,
  rapidVoteWindowMs: 10 * 60 * 1000,
  rapidVoteThreshold: 3,
} as const

export function detectAnomalies(
  auditLogs: readonly AuditLogDoc[],
  petitions: readonly PetitionDoc[],
  options: AnomalyOptions = {},
): Anomaly[] {
  const {
    largeWithdrawalShare = ANOMALY_DEFAULTS.largeWithdrawalShare,
    rapidVoteWindowMs = ANOMALY_DEFAULTS.rapidVoteWindowMs,
    rapidVoteThreshold = ANOMALY_DEFAULTS.rapidVoteThreshold,
    now = Date.now(),
  } = options

  const flags: Anomaly[] = []

  const payouts = auditLogs.filter((entry) => entry.type === 'payout')
  for (const entry of payouts) {
    const vaultBefore = entry.balanceAfter + entry.amount
    if (vaultBefore > 0 && entry.amount / vaultBefore >= largeWithdrawalShare) {
      flags.push({
        code: 'largeWithdrawal',
        severity: entry.amount / vaultBefore >= 0.75 ? 'high' : 'low',
        params: {
          amount: entry.amount,
          share: `${Math.round((entry.amount / vaultBefore) * 100)}%`,
        },
        at: entry.timestamp,
        refId: entry.relatedId ?? entry.id,
      })
    }
  }

  for (const petition of petitions) {
    const votes = [...petition.votes].sort((a, b) => a.at - b.at)
    for (let i = 0; i < votes.length; i += 1) {
      const windowVotes = votes.filter(
        (v) => v.at >= votes[i].at && v.at - votes[i].at <= rapidVoteWindowMs,
      )
      if (windowVotes.length >= rapidVoteThreshold) {
        const alreadyFlagged = flags.some(
          (f) => f.code === 'rapidVotes' && f.refId === petition.id,
        )
        if (!alreadyFlagged) {
          flags.push({
            code: 'rapidVotes',
            severity: windowVotes.length >= rapidVoteThreshold * 2 ? 'high' : 'low',
            params: {
              count: windowVotes.length,
              minutes: Math.round(rapidVoteWindowMs / 60000),
            },
            at: votes[i].at,
            refId: petition.id,
          })
        }
        break
      }
    }
  }

  return flags.sort((a, b) => b.at - a.at).filter((f) => f.at <= now)
}
