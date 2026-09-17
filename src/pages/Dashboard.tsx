import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Package, Boxes, TrendingUp, TrendingDown, Wallet, AlertTriangle } from 'lucide-react'
import { getData } from '../lib/api'
import { money, number, displayDate, cx } from '../lib/format'
import { useT } from '../i18n'
import { EmptyState, Skeleton, StatCard, TableSkeleton } from '../components/ui'
import type { DashboardSummary, LowStockItem, RecentSale, SalesChartPoint } from '../lib/types'

export function Dashboard() {
  const navigate = useNavigate()
  const t = useT()

  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => getData<DashboardSummary>('/dashboard/summary'),
  })

  const lowStock = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: () => getData<LowStockItem[]>('/dashboard/low-stock', { take: 10 }),
  })

  const recent = useQuery({
    queryKey: ['dashboard-recent-sales'],
    queryFn: () => getData<RecentSale[]>('/dashboard/recent-sales', { take: 10 }),
  })

  const chart = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => getData<SalesChartPoint[]>('/dashboard/sales-chart', { days: 7 }),
  })

  const s = summary.data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">{t('nav.dashboard')}</h1>

      {summary.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t('dash.totalProducts')}
            value={number(s?.totalProducts)}
            icon={<Package className="h-5 w-5 text-slate-400" />}
            onClick={() => navigate('/products')}
          />
          <StatCard
            label={t('dash.totalStock')}
            value={number(s?.totalStockQty)}
            sub={t('dash.stockValue', money(s?.stockValueAtCost))}
            icon={<Boxes className="h-5 w-5 text-slate-400" />}
          />
          <StatCard
            label={t('dash.todayPurchases')}
            value={money(s?.todayPurchaseAmount)}
            icon={<TrendingDown className="h-5 w-5 text-slate-400" />}
          />
          <StatCard
            label={t('dash.todaySales')}
            value={money(s?.todaySaleAmount)}
            tone="brand"
            sub={t('dash.thisMonth', money(s?.monthSaleAmount))}
            icon={<TrendingUp className="h-5 w-5 text-brand-500" />}
          />
          <StatCard
            label={t('dash.todayProfit')}
            value={money(s?.todayProfit)}
            tone="success"
            sub={t('dash.thisMonth', money(s?.monthProfit))}
            icon={<Wallet className="h-5 w-5 text-emerald-500" />}
          />
          <StatCard
            label={t('dash.lowStockCount')}
            value={number(s?.lowStockCount)}
            tone={s && s.lowStockCount > 0 ? 'danger' : 'default'}
            sub={t('dash.clickForDetail')}
            onClick={() => navigate('/products?lowStockOnly=true')}
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          />
        </div>
      )}

      {/* 7-day trend */}
      <section className="card p-4">
        <h2 className="mb-4 text-lg">{t('dash.chartTitle')}</h2>
        {chart.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data ?? []} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => value.slice(5, 10)}
                  tick={{ fontSize: 12, fontFamily: 'Inter' }}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 12, fontFamily: 'Inter' }} stroke="#94a3b8" width={70} />
                <Tooltip
                  formatter={(value, key) => [
                    money(Number(value)),
                    key === 'saleAmount' ? t('chart.sales') : t('chart.profit'),
                  ]}
                  labelFormatter={(label) => displayDate(String(label))}
                  contentStyle={{ fontFamily: 'Inter', fontSize: 12 }}
                />
                <Bar dataKey="saleAmount" fill="#2f6fed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Low stock */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg">{t('dash.lowStock')}</h2>
            <button className="text-sm text-brand-600" onClick={() => navigate('/products?lowStockOnly=true')}>
              {t('common.seeAll')}
            </button>
          </div>

          {lowStock.isLoading ? (
            <TableSkeleton cols={4} />
          ) : lowStock.data?.length === 0 ? (
            <EmptyState title={t('dash.noLowStock')} />
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.product')}</th>
                  <th className="cell text-start">{t('product.brand')}</th>
                  <th className="cell text-end">{t('product.remainingShort')}</th>
                  <th className="cell text-end">{t('product.alertLevel')}</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.data?.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 bg-red-50/40">
                    <td className="cell">
                      <p className="latin">{item.name}</p>
                      <p className="latin text-xs text-slate-500">{item.model}</p>
                    </td>
                    <td className="cell latin text-slate-600">{item.brandName ?? '-'}</td>
                    <td className="cell latin text-end font-semibold text-red-600">{item.quantityInStock}</td>
                    <td className="cell latin text-end text-slate-500">{item.lowStockThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Recent sales */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg">{t('dash.recentSales')}</h2>
            <button className="text-sm text-brand-600" onClick={() => navigate('/sales')}>
              {t('common.seeAll')}
            </button>
          </div>

          {recent.isLoading ? (
            <TableSkeleton cols={4} />
          ) : recent.data?.length === 0 ? (
            <EmptyState title={t('dash.noSales')} />
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.invoiceNo')}</th>
                  <th className="cell text-start">{t('sale.customer')}</th>
                  <th className="cell text-end">{t('sale.amount')}</th>
                  <th className="cell text-end">{t('sale.profit')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.data?.map((sale) => (
                  <tr key={sale.id} className="border-t border-slate-100">
                    <td className="cell latin">{sale.invoiceNo}</td>
                    <td className="cell">{sale.customerName || '-'}</td>
                    <td className="cell latin text-end">{money(sale.totalAmount)}</td>
                    <td className={cx('cell latin text-end', sale.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {money(sale.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
