/**
 * Wallet helpers (PROVIDER-PLATFORM-PHASE2-PROMPT §1). The server owns every amount; these only shape
 * input and pick the right explanation.
 */

/** Strips spaces and upper-cases: what the server receives. */
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

/** "SA03 8000 0000 6080 1016 7519" — groups of 4 while typing. */
export function formatIban(value: string): string {
  return normalizeIban(value)
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

/** Saudi IBAN: "SA" + 22 digits (§1.2). The server re-checks (`IbanInvalid`). */
export function isSaudiIban(value: string): boolean {
  return /^SA\d{22}$/.test(normalizeIban(value))
}

export const CANNOT_WITHDRAW_REASONS = ['OwnerOnly', 'BankAccountMissing', 'OpenWithdrawalExists', 'BelowMinimum'] as const
export type CannotWithdrawReason = (typeof CANNOT_WITHDRAW_REASONS)[number]

/** A known reason, or null for an unknown/absent one (never crash on a new server value). */
export function withdrawBlock(reason: string | null | undefined): CannotWithdrawReason | 'Unknown' | null {
  if (!reason) return null
  return (CANNOT_WITHDRAW_REASONS as readonly string[]).includes(reason) ? (reason as CannotWithdrawReason) : 'Unknown'
}

export const WALLET_TABS = ['available', 'onHold', 'withdrawals'] as const
export type WalletTab = (typeof WALLET_TABS)[number]
