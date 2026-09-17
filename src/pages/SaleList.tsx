import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, Ban, Plus, Printer } from 'lucide-react'
import { errorMessage, getData, postData } from '../lib/api'
import { cx, daysAgo, displayDate, money, paymentLabel, saleTypeLabel, today } from '../lib/format'
import { useT } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { Badge, EmptyState, Modal, Pager, TableSkeleton } from '../components/ui'
import { ReceiptView } from './ReceiptView'
import type { PagedResult, Receipt, SaleDetail, SaleListItem } from '../lib/types'

export function SaleList() {
  const { isAdmin } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [receiptId, setReceiptId] = useState<number | null>(null)

  const sales = useQuery({
    queryKey: ['sales', { from, to, page }],
    queryFn: () => getData<PagedResult<SaleListItem>>('/sales', { from, to, page, pageSize: 20 }),
    placeholderData: keepPreviousData,
  })

  const detail = useQuery({
    queryKey: ['sale', detailId],
    queryFn: () => getData<SaleDetail>(`/sales/${detailId}`),
    enabled: detailId !== null,
  })

  const receipt = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => getData<Receipt>(`/sales/${receiptId}/receipt`),
    enabled: receiptId !== null,
  })

  const voidInvoice = useMutation({
    mutationFn: (id: number) => postData(`/sales/${id}/void`),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(response.message)
      setDetailId(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const rows = sales.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.sales')}</h1>
        <Link to="/sales/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          {t('nav.newSale')}
        </Link>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <label className="label">{t('common.fromDate')}</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="field latin" />
        </div>
        <div>
          <label className="label">{t('common.toDate')}</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="field latin" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {sales.isLoading ? (
          <TableSkeleton cols={8} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('sale.none')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.invoiceNo')}</th>
                  <th className="cell text-start">{t('common.date')}</th>
                  <th className="cell text-start">{t('sale.customer')}</th>
                  <th className="cell text-start">{t('sale.type')}</th>
                  <th className="cell text-start">{t('sale.payment')}</th>
                  <th className="cell text-end">{t('sale.items')}</th>
                  <th className="cell text-end">{t('sale.amount')}</th>
                  <th className="cell text-end">{t('sale.profit')}</th>
                  <th className="cell text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => (
                  <tr key={sale.id} className={cx('border-t border-slate-100', sale.isVoided && 'opacity-50')}>
                    <td className="cell">
                      <span className="latin">{sale.invoiceNo}</span>
                      {sale.isVoided && (
                        <span className="ms-2">
                          <Badge tone="red">{t('common.voided')}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="cell latin">{displayDate(sale.saleDate)}</td>
                    <td className="cell">{sale.customerName || '-'}</td>
                    <td className="cell">{saleTypeLabel(t, sale.saleType)}</td>
                    <td className="cell">{paymentLabel(t, sale.paymentMethod)}</td>
                    <td className="cell latin text-end">
                      {sale.itemCount} / {sale.totalQuantity}
                    </td>
                    <td className="cell latin text-end">{money(sale.totalAmount)}</td>
                    <td className={cx('cell latin text-end', sale.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {money(sale.totalProfit)}
                    </td>
                    <td className="cell">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setDetailId(sale.id)}
                          className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                          title={t('common.detail')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setReceiptId(sale.id)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          title={t('receipt.title')}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {isAdmin && !sale.isVoided && (
                          <button
                            onClick={() => {
                              if (confirm(t('sale.confirmVoid', sale.invoiceNo))) {
                                voidInvoice.mutate(sale.id)
                              }
                            }}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title={t('common.void')}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sales.data && (
          <Pager
            page={sales.data.page}
            totalPages={sales.data.totalPages}
            totalCount={sales.data.totalCount}
            onChange={setPage}
          />
        )}
      </div>

      <Modal open={detailId !== null} wide title={t('sale.detail')} onClose={() => setDetailId(null)}>
        {detail.isLoading && <TableSkeleton cols={5} />}
        {detail.data && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <Info label={t('sale.invoiceNo')} value={detail.data.invoiceNo} latin />
              <Info label={t('common.date')} value={displayDate(detail.data.saleDate)} latin />
              <Info label={t('sale.customer')} value={detail.data.customerName || '-'} />
              <Info label={t('sale.payment')} value={paymentLabel(t, detail.data.paymentMethod)} />
            </div>

            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.product')}</th>
                  <th className="cell text-end">{t('sale.quantity')}</th>
                  <th className="cell text-end">{t('sale.price')}</th>
                  <th className="cell text-end">{t('sale.cost')}</th>
                  <th className="cell text-end">{t('sale.total')}</th>
                  <th className="cell text-end">{t('sale.profit')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="cell latin">
                      {item.productName}
                      <span className="block text-xs text-slate-500">{item.model}</span>
                    </td>
                    <td className="cell latin text-end">{item.quantity}</td>
                    <td className="cell latin text-end">{money(item.unitPrice)}</td>
                    <td className="cell latin text-end text-slate-500">{money(item.unitCost)}</td>
                    <td className="cell latin text-end">{money(item.lineTotal)}</td>
                    <td className="cell latin text-end text-emerald-600">{money(item.lineProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <Line label={t('sale.subtotal')} value={money(detail.data.subTotal)} />
                <Line label={t('sale.discount')} value={money(detail.data.discount)} />
                <Line label={t('sale.grandTotal')} value={money(detail.data.totalAmount)} bold />
                <Line label={t('sale.totalCost')} value={money(detail.data.totalCost)} />
                <Line label={t('sale.totalProfit')} value={money(detail.data.totalProfit)} bold />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={receiptId !== null} title={t('receipt.title')} onClose={() => setReceiptId(null)}>
        {receipt.isLoading && <TableSkeleton cols={3} />}
        {receipt.data && <ReceiptView receipt={receipt.data} />}
      </Modal>
    </div>
  )
}

function Info({ label, value, latin }: { label: string; value: string; latin?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={latin ? 'latin' : undefined}>{value}</p>
    </div>
  )
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'border-t border-slate-200 pt-1 font-semibold' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className="latin">{value}</span>
    </div>
  )
}
