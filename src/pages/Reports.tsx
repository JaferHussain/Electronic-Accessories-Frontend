import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Printer } from 'lucide-react'
import { downloadFile, errorMessage, getData } from '../lib/api'
import { cx, daysAgo, displayDate, displayDateTime, money, number, today, txnTypeLabel } from '../lib/format'
import { useT, type Translate } from '../i18n'
import { STRINGS, type StringKey } from '../i18n/strings'
import { EmptyState, TableSkeleton } from '../components/ui'
import type { ReportResult } from '../lib/types'

type TabId =
  | 'daily-sales' | 'monthly-sales' | 'purchase-summary' | 'sales-summary'
  | 'profit-by-product' | 'current-stock' | 'low-stock' | 'stock-history'

interface Column {
  header: StringKey
  /** Anything but 'text' is rendered Latin; money/number are also end-aligned. */
  kind?: 'text' | 'code' | 'money' | 'number' | 'date' | 'datetime'
  get: (row: Record<string, unknown>, t: Translate) => unknown
}

/** Summary keys the API returns, mapped to their label and whether they are a count. */
const SUMMARY_LABELS: Record<string, StringKey> = {
  invoiceCount: 'sum.invoiceCount',
  totalQuantity: 'sum.totalQuantity',
  totalAmount: 'sum.totalAmount',
  totalCost: 'sum.totalCost',
  totalProfit: 'sum.totalProfit',
  totalDiscount: 'sum.totalDiscount',
  totalPaid: 'sum.totalPaid',
  balance: 'sum.balance',
  productCount: 'sum.productCount',
  quantitySold: 'sum.quantitySold',
  saleAmount: 'sum.saleAmount',
  costAmount: 'sum.costAmount',
  profit: 'sum.profit',
  valueAtCost: 'sum.valueAtCost',
  valueAtRetail: 'sum.valueAtRetail',
  potentialProfit: 'sum.potentialProfit',
  rowCount: 'sum.rowCount',
  totalIn: 'sum.totalIn',
  totalOut: 'sum.totalOut',
}

const COUNT_KEYS = new Set([
  'invoiceCount', 'totalQuantity', 'productCount', 'quantitySold', 'rowCount', 'totalIn', 'totalOut',
])

const TABS: { id: TabId; label: StringKey; needsRange?: boolean; needsMonth?: boolean; needsDate?: boolean }[] = [
  { id: 'daily-sales', label: 'report.dailySales', needsDate: true },
  { id: 'monthly-sales', label: 'report.monthlySales', needsMonth: true },
  { id: 'purchase-summary', label: 'report.purchaseSummary', needsRange: true },
  { id: 'sales-summary', label: 'report.salesSummary', needsRange: true },
  { id: 'profit-by-product', label: 'report.profitByProduct', needsRange: true },
  { id: 'current-stock', label: 'report.currentStock' },
  { id: 'low-stock', label: 'report.lowStock' },
  { id: 'stock-history', label: 'report.stockHistory', needsRange: true },
]

const COLUMNS: Record<TabId, Column[]> = {
  'daily-sales': [
    { header: 'sale.invoiceNo', kind: 'code', get: (r) => r.invoiceNo },
    { header: 'common.time', kind: 'datetime', get: (r) => r.createdAt },
    { header: 'sale.customer', kind: 'text', get: (r) => r.customerName ?? '-' },
    { header: 'sale.payment', kind: 'text', get: (r) => r.paymentMethodText },
    { header: 'sale.quantity', kind: 'number', get: (r) => r.totalQuantity },
    { header: 'sale.amount', kind: 'money', get: (r) => r.totalAmount },
    { header: 'sale.cost', kind: 'money', get: (r) => r.totalCost },
    { header: 'sale.profit', kind: 'money', get: (r) => r.totalProfit },
  ],
  'sales-summary': [
    { header: 'sale.invoiceNo', kind: 'code', get: (r) => r.invoiceNo },
    { header: 'common.date', kind: 'date', get: (r) => r.saleDate },
    { header: 'sale.customer', kind: 'text', get: (r) => r.customerName ?? '-' },
    { header: 'sale.quantity', kind: 'number', get: (r) => r.totalQuantity },
    { header: 'sale.amount', kind: 'money', get: (r) => r.totalAmount },
    { header: 'sale.cost', kind: 'money', get: (r) => r.totalCost },
    { header: 'sale.profit', kind: 'money', get: (r) => r.totalProfit },
  ],
  'monthly-sales': [
    { header: 'report.period', kind: 'code', get: (r) => r.period },
    { header: 'report.invoices', kind: 'number', get: (r) => r.invoiceCount },
    { header: 'sale.quantity', kind: 'number', get: (r) => r.totalQuantity },
    { header: 'sum.saleAmount', kind: 'money', get: (r) => r.totalAmount },
    { header: 'sale.cost', kind: 'money', get: (r) => r.totalCost },
    { header: 'sale.profit', kind: 'money', get: (r) => r.totalProfit },
  ],
  'purchase-summary': [
    { header: 'sale.invoiceNo', kind: 'code', get: (r) => r.invoiceNo },
    { header: 'common.date', kind: 'date', get: (r) => r.purchaseDate },
    { header: 'purchase.supplier', kind: 'text', get: (r) => r.supplierName ?? '-' },
    { header: 'sale.quantity', kind: 'number', get: (r) => r.totalQuantity },
    { header: 'sale.amount', kind: 'money', get: (r) => r.totalAmount },
    { header: 'purchase.paid', kind: 'money', get: (r) => r.paidAmount },
  ],
  'profit-by-product': [
    { header: 'product.code', kind: 'code', get: (r) => r.code },
    { header: 'sale.product', kind: 'code', get: (r) => r.name },
    { header: 'product.model', kind: 'code', get: (r) => r.model ?? '-' },
    { header: 'product.brand', kind: 'code', get: (r) => r.brandName ?? '-' },
    { header: 'report.qtySold', kind: 'number', get: (r) => r.quantitySold },
    { header: 'sum.saleAmount', kind: 'money', get: (r) => r.saleAmount },
    { header: 'sale.cost', kind: 'money', get: (r) => r.costAmount },
    { header: 'sale.profit', kind: 'money', get: (r) => r.profit },
  ],
  'current-stock': [
    { header: 'product.code', kind: 'code', get: (r) => r.code },
    { header: 'sale.product', kind: 'code', get: (r) => r.name },
    { header: 'product.model', kind: 'code', get: (r) => r.model ?? '-' },
    { header: 'product.brand', kind: 'code', get: (r) => r.brandName ?? '-' },
    { header: 'product.remainingShort', kind: 'number', get: (r) => r.quantityInStock },
    { header: 'product.purchasePrice', kind: 'money', get: (r) => r.purchasePrice },
    { header: 'product.retailPrice', kind: 'money', get: (r) => r.retailPrice },
    { header: 'sum.valueAtCost', kind: 'money', get: (r) => r.stockValueAtCost },
  ],
  'low-stock': [
    { header: 'product.code', kind: 'code', get: (r) => r.code },
    { header: 'sale.product', kind: 'code', get: (r) => r.name },
    { header: 'product.model', kind: 'code', get: (r) => r.model ?? '-' },
    { header: 'product.brand', kind: 'code', get: (r) => r.brandName ?? '-' },
    { header: 'product.remainingShort', kind: 'number', get: (r) => r.quantityInStock },
    { header: 'product.alertLevel', kind: 'number', get: (r) => r.lowStockThreshold },
  ],
  'stock-history': [
    { header: 'common.time', kind: 'datetime', get: (r) => r.txnDate },
    { header: 'product.code', kind: 'code', get: (r) => r.productCode },
    { header: 'sale.product', kind: 'code', get: (r) => r.productName },
    { header: 'sale.type', kind: 'text', get: (r, t) => txnTypeLabel(t, Number(r.txnType)) },
    { header: 'report.reference', kind: 'code', get: (r) => r.referenceNo ?? '-' },
    { header: 'report.qtyIn', kind: 'number', get: (r) => r.qtyIn },
    { header: 'report.qtyOut', kind: 'number', get: (r) => r.qtyOut },
    { header: 'report.balance', kind: 'number', get: (r) => r.balanceAfter },
  ],
}

export function Reports() {
  const t = useT()
  const [tab, setTab] = useState<TabId>('daily-sales')
  const [date, setDate] = useState(today())
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(today())
  const [month, setMonth] = useState(today().slice(0, 7))
  const [downloading, setDownloading] = useState(false)

  const config = TABS.find((item) => item.id === tab)!

  const params = useMemo(() => {
    if (config.needsDate) return { date }
    if (config.needsMonth) {
      const [year, m] = month.split('-')
      return { year: Number(year), month: Number(m) }
    }
    if (config.needsRange) return { from, to }
    return {}
  }, [config, date, month, from, to])

  const report = useQuery({
    queryKey: ['report', tab, params],
    queryFn: () => getData<ReportResult<Record<string, unknown>>>(`/reports/${tab}`, params),
  })

  async function exportExcel() {
    setDownloading(true)
    try {
      await downloadFile(`/reports/${tab}`, `${tab}-${today()}.xlsx`, { ...params, export: 'excel' })
    } catch (error) {
      toast.error(errorMessage(error, t('report.excelFailed')))
    } finally {
      setDownloading(false)
    }
  }

  const columns = COLUMNS[tab]
  const rows = report.data?.rows ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('nav.reports')}</h1>

      <div className="flex flex-wrap gap-2 no-print">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cx(
              'rounded-lg border px-3 py-2 text-sm transition',
              tab === item.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white',
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4 no-print">
        {config.needsDate && (
          <div>
            <label className="label">{t('common.date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field latin" />
          </div>
        )}

        {config.needsMonth && (
          <div>
            <label className="label">{t('common.month')}</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="field latin" />
          </div>
        )}

        {config.needsRange && (
          <>
            <div>
              <label className="label">{t('common.fromDate')}</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field latin" />
            </div>
            <div>
              <label className="label">{t('common.toDate')}</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field latin" />
            </div>
          </>
        )}

        <div className="ms-auto flex gap-2">
          <button onClick={exportExcel} disabled={downloading} className="btn-ghost">
            <Download className="h-4 w-4" />
            {downloading ? t('common.preparing') : t('common.excel')}
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer className="h-4 w-4" />
            {t('common.print')}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {report.data && Object.keys(report.data.summary).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(report.data.summary).map(([key, value]) => {
            const labelKey = SUMMARY_LABELS[key]
            return (
              <div key={key} className="card p-3">
                <p className="text-xs text-slate-500">{labelKey && STRINGS[labelKey] ? t(labelKey) : key}</p>
                <p className="latin text-lg font-semibold">{COUNT_KEYS.has(key) ? number(value) : money(value)}</p>
              </div>
            )
          })}
        </div>
      )}

      <div id="receipt-print" className="card overflow-hidden">
        {report.isLoading ? (
          <TableSkeleton cols={columns.length} rows={8} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('report.none')} hint={t('report.noneHint')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.header}
                      className={cx('cell', column.kind === 'money' || column.kind === 'number' ? 'text-end' : 'text-start')}
                    >
                      {t(column.header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {columns.map((column) => {
                      const raw = column.get(row, t)
                      const kind = column.kind ?? 'code'
                      return (
                        <td
                          key={column.header}
                          className={cx(
                            'cell',
                            kind === 'money' || kind === 'number' ? 'latin text-end' : '',
                            kind === 'date' || kind === 'datetime' || kind === 'code' ? 'latin' : '',
                          )}
                        >
                          {kind === 'money'
                            ? money(Number(raw))
                            : kind === 'number'
                              ? number(Number(raw))
                              : kind === 'date'
                                ? displayDate(String(raw))
                                : kind === 'datetime'
                                  ? displayDateTime(String(raw))
                                  : String(raw ?? '-')}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
