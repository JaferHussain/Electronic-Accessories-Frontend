import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Translate } from '../i18n'
import {
  cx,
  daysAgo,
  displayDate,
  displayDateTime,
  isoDate,
  money,
  number,
  paymentLabel,
  saleTypeLabel,
  startOfMonth,
  today,
  txnTypeLabel,
} from './format'

describe('money', () => {
  it('formats a whole amount with no decimals', () => {
    expect(money(1250)).toBe('Rs. 1,250')
  })

  it('formats an amount with paisas to two decimals', () => {
    expect(money(1250.5)).toBe('Rs. 1,250.50')
  })

  it('groups thousands', () => {
    expect(money(1234567)).toBe('Rs. 1,234,567')
  })

  it('renders zero rather than an empty string', () => {
    expect(money(0)).toBe('Rs. 0')
  })

  it.each([null, undefined])('treats %s as zero', (value) => {
    // Every list screen renders totals straight from the API, where a column can be null.
    // "Rs. NaN" on a receipt would be worse than a wrong number.
    expect(money(value)).toBe('Rs. 0')
  })

  it('formats a negative amount, since a loss-making sale is a real event', () => {
    expect(money(-450)).toBe('Rs. -450')
  })

  it('caps at two decimal places', () => {
    expect(money(10.005)).toBe('Rs. 10.01')
    expect(money(10.004)).toBe('Rs. 10')
  })

  it('uses Latin digits regardless of the active language', () => {
    // The shop reads amounts in Latin digits even in the Urdu UI. Locale-aware digit
    // shaping here would change every price on every screen.
    expect(money(1250)).toMatch(/^Rs\. [\d,]+$/)
  })
})

describe('number', () => {
  it('groups thousands', () => {
    expect(number(15000)).toBe('15,000')
  })

  it.each([null, undefined])('treats %s as zero', (value) => {
    expect(number(value)).toBe('0')
  })

  it('formats a negative stock balance', () => {
    expect(number(-3)).toBe('-3')
  })
})

describe('isoDate', () => {
  it('formats a Date as yyyy-MM-dd', () => {
    expect(isoDate(new Date(2026, 7, 31))).toBe('2026-08-31')
  })

  it('accepts an ISO string', () => {
    expect(isoDate('2026-08-31T14:30:00')).toBe('2026-08-31')
  })

  it('does not shift the day across the local timezone offset', () => {
    // The naive `new Date(x).toISOString().slice(0,10)` yields the previous day for any
    // positive-offset timezone late in the evening. Pakistan is UTC+5, so a sale recorded
    // at 02:00 would file itself under yesterday. This is why the function subtracts the
    // offset first, and this test is what keeps that correction in place.
    expect(isoDate(new Date(2026, 7, 31, 2, 0, 0))).toBe('2026-08-31')
    expect(isoDate(new Date(2026, 7, 31, 23, 59, 0))).toBe('2026-08-31')
  })

  it('handles the first and last day of a month', () => {
    expect(isoDate(new Date(2026, 0, 1))).toBe('2026-01-01')
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('handles a leap day', () => {
    expect(isoDate(new Date(2028, 1, 29))).toBe('2028-02-29')
  })
})

describe('displayDate', () => {
  it('formats a value', () => {
    expect(displayDate('2026-08-31T00:00:00')).toBe('2026-08-31')
  })

  it.each([null, undefined, ''])('renders a dash for %s', (value) => {
    expect(displayDate(value)).toBe('-')
  })
})

describe('displayDateTime', () => {
  it('appends 24-hour time to the date', () => {
    expect(displayDateTime('2026-08-31T14:05:00')).toBe('2026-08-31 14:05')
  })

  it('pads a single-digit hour', () => {
    expect(displayDateTime('2026-08-31T09:05:00')).toBe('2026-08-31 09:05')
  })

  it.each([null, undefined, ''])('renders a dash for %s', (value) => {
    expect(displayDateTime(value)).toBe('-')
  })
})

describe('cx', () => {
  it('joins truthy class names', () => {
    expect(cx('a', 'b')).toBe('a b')
  })

  it.each([false, null, undefined, ''])('drops %s', (value) => {
    expect(cx('a', value as string | false | null | undefined, 'b')).toBe('a b')
  })

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(false, null, undefined)).toBe('')
  })
})

describe('relative date helpers', () => {
  // These read the system clock, so they are pinned against fake timers rather than
  // against "whatever today happens to be" — a test asserting today() === today() would
  // pass without proving anything.
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 31, 10, 0, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('today returns the current date in ISO form', () => {
    expect(today()).toBe('2026-08-31')
  })

  it('daysAgo counts back from today', () => {
    expect(daysAgo(0)).toBe('2026-08-31')
    expect(daysAgo(1)).toBe('2026-08-30')
    expect(daysAgo(30)).toBe('2026-08-01')
  })

  it('daysAgo crosses a month boundary', () => {
    expect(daysAgo(31)).toBe('2026-07-31')
  })

  it('daysAgo crosses a year boundary', () => {
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0, 0))
    expect(daysAgo(10)).toBe('2025-12-26')
  })

  it('startOfMonth returns the first of the current month', () => {
    expect(startOfMonth()).toBe('2026-08-01')
  })

  it('startOfMonth works on the first of the month', () => {
    vi.setSystemTime(new Date(2026, 7, 1, 10, 0, 0))
    expect(startOfMonth()).toBe('2026-08-01')
  })
})

describe('enum labels', () => {
  // A minimal translator standing in for the i18n provider: returns the key so the test
  // asserts which label was chosen, independent of the translation text itself.
  const t = ((key: string) => key) as unknown as Translate

  it('saleTypeLabel maps 2 to wholesale and anything else to retail', () => {
    expect(saleTypeLabel(t, 2)).toBe('sale.wholesale')
    expect(saleTypeLabel(t, 1)).toBe('sale.retail')
    expect(saleTypeLabel(t, 0)).toBe('sale.retail')
  })

  it('paymentLabel maps each known method', () => {
    expect(paymentLabel(t, 1)).toBe('pay.cash')
    expect(paymentLabel(t, 2)).toBe('pay.easypaisa')
    expect(paymentLabel(t, 3)).toBe('pay.credit')
  })

  it('paymentLabel falls back to cash for an unknown method', () => {
    expect(paymentLabel(t, 99)).toBe('pay.cash')
  })

  it('txnTypeLabel maps each known transaction type', () => {
    expect(txnTypeLabel(t, 1)).toBe('txn.1')
    expect(txnTypeLabel(t, 5)).toBe('txn.5')
  })

  it('txnTypeLabel renders the raw number when the key is unknown', () => {
    // An unrecognised ledger type must still be legible on screen rather than blank.
    expect(txnTypeLabel(t, 99)).toBe('99')
  })
})
