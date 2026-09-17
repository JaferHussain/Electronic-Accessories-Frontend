import { useEffect, type ReactNode } from 'react'
import { X, Inbox } from 'lucide-react'
import { cx } from '../lib/format'
import { useT } from '../i18n'

/** Grey placeholder bars shown while a query is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-slate-200', className)} />
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-2">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
      <Inbox className="h-10 w-10" />
      <p className="text-sm">{title}</p>
      {hint && <p className="text-xs">{hint}</p>}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const t = useT()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div className={cx('mt-8 w-full card', wide ? 'max-w-4xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label={t('common.close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  onClick,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'danger' | 'success' | 'brand'
  onClick?: () => void
  icon?: ReactNode
}) {
  const tones = {
    default: 'bg-white border-slate-200',
    brand: 'bg-brand-50 border-brand-200',
    success: 'bg-emerald-50 border-emerald-200',
    danger: 'bg-red-50 border-red-300',
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={cx(
        'rounded-xl border p-4 shadow-card transition',
        tones[tone],
        onClick && 'cursor-pointer hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        {icon}
      </div>
      <p className="latin mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function Pager({
  page,
  totalPages,
  totalCount,
  onChange,
}: {
  page: number
  totalPages: number
  totalCount: number
  onChange: (page: number) => void
}) {
  const t = useT()

  if (totalPages <= 1) {
    return <p className="px-3 py-2 text-xs text-slate-400">{t('common.pagerTotal', totalCount)}</p>
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <p className="text-xs text-slate-500">{t('common.pagerPage', totalCount, page, totalPages)}</p>
      <div className="flex gap-2">
        <button className="btn-ghost px-3 py-1" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('common.prev')}
        </button>
        <button className="btn-ghost px-3 py-1" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          {t('common.next')}
        </button>
      </div>
    </div>
  )
}

/** Small coloured pill used for statuses. */
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'red' | 'green' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-100 text-red-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-brand-100 text-brand-700',
  }
  return <span className={cx('rounded-full px-2 py-0.5 text-xs', tones[tone])}>{children}</span>
}
