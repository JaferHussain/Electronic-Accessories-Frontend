import type { Translate } from '../i18n'
import { STRINGS, type StringKey } from '../i18n/strings'

/** Rs. 1,250 - always Latin digits, grouped, no decimals unless there are paisas. */
export function money(value: number | null | undefined): string {
  const amount = Number(value ?? 0)
  const hasFraction = Math.abs(amount % 1) > 0.004
  return `Rs. ${amount.toLocaleString('en-PK', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function number(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-PK')
}

/** yyyy-MM-dd, the format every date input and API query expects. */
export function isoDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function displayDate(value: string | null | undefined): string {
  if (!value) return '-'
  return isoDate(value)
}

export function displayDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  return `${isoDate(date)} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function today(): string {
  return isoDate(new Date())
}

export function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return isoDate(date)
}

export function startOfMonth(): string {
  const date = new Date()
  return isoDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

// Enum labels. The API sends raw values; the label is rendered in the active language.

export function saleTypeLabel(t: Translate, saleType: number): string {
  return saleType === 2 ? t('sale.wholesale') : t('sale.retail')
}

export function paymentLabel(t: Translate, method: number): string {
  if (method === 2) return t('pay.easypaisa')
  if (method === 3) return t('pay.credit')
  return t('pay.cash')
}

export function txnTypeLabel(t: Translate, txnType: number): string {
  const key = `txn.${txnType}` as StringKey
  return STRINGS[key] ? t(key) : String(txnType)
}

/** Joins conditional class names. */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}
