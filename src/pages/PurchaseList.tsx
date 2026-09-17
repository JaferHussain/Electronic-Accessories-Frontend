import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, Ban, Plus } from 'lucide-react'
import { errorMessage, getData, postData } from '../lib/api'
import { daysAgo, displayDate, money, today } from '../lib/format'
import { useT } from '../i18n'
import { Badge, EmptyState, Modal, Pager, TableSkeleton } from '../components/ui'
import type { PagedResult, PurchaseDetail, PurchaseListItem, Supplier } from '../lib/types'

export function PurchaseList() {
  const t = useT()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [supplierId, setSupplierId] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)

  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => getData<Supplier[]>('/suppliers') })

  const purchases = useQuery({
    queryKey: ['purchases', { from, to, supplierId, page }],
    queryFn: () =>
      getData<PagedResult<PurchaseListItem>>('/purchases', {
        from,
        to,
        supplierId: supplierId || undefined,
        page,
        pageSize: 20,
      }),
    placeholderData: keepPreviousData,
  })

  const detail = useQuery({
    queryKey: ['purchase', detailId],
    queryFn: () => getData<PurchaseDetail>(`/purchases/${detailId}`),
    enabled: detailId !== null,
  })

  const voidInvoice = useMutation({
    mutationFn: (id: number) => postData(`/purchases/${id}/void`),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(response.message)
      setDetailId(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const rows = purchases.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.purchases')}</h1>
        <Link to="/purchases/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          {t('nav.newPurchase')}
        </Link>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label">{t('common.fromDate')}</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="field latin" />
        </div>
        <div>
          <label className="label">{t('common.toDate')}</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="field latin" />
        </div>
        <div>
          <label className="label">{t('purchase.supplier')}</label>
          <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1) }} className="field">
            <option value="">{t('purchase.allSuppliers')}</option>
            {suppliers.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {purchases.isLoading ? (
          <TableSkeleton cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('purchase.none')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.invoiceNo')}</th>
                  <th className="cell text-start">{t('common.date')}</th>
                  <th className="cell text-start">{t('purchase.supplier')}</th>
                  <th className="cell text-end">{t('sale.items')}</th>
                  <th className="cell text-end">{t('sale.amount')}</th>
                  <th className="cell text-end">{t('purchase.paid')}</th>
                  <th className="cell text-end">{t('purchase.balance')}</th>
                  <th className="cell text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-slate-100">
                    <td className="cell">
                      <span className="latin">{purchase.invoiceNo}</span>
                      {purchase.isVoided && (
                        <span className="ms-2">
                          <Badge tone="red">{t('common.voided')}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="cell latin">{displayDate(purchase.purchaseDate)}</td>
                    <td className="cell">{purchase.supplierName ?? '-'}</td>
                    <td className="cell latin text-end">
                      {purchase.itemCount} / {purchase.totalQuantity}
                    </td>
                    <td className="cell latin text-end">{money(purchase.totalAmount)}</td>
                    <td className="cell latin text-end">{money(purchase.paidAmount)}</td>
                    <td className="cell latin text-end">{money(purchase.balance)}</td>
                    <td className="cell">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setDetailId(purchase.id)}
                          className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                          title={t('common.detail')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {!purchase.isVoided && (
                          <button
                            onClick={() => {
                              if (confirm(t('sale.confirmVoid', purchase.invoiceNo))) {
                                voidInvoice.mutate(purchase.id)
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

        {purchases.data && (
          <Pager
            page={purchases.data.page}
            totalPages={purchases.data.totalPages}
            totalCount={purchases.data.totalCount}
            onChange={setPage}
          />
        )}
      </div>

      <Modal open={detailId !== null} wide title={t('purchase.detail')} onClose={() => setDetailId(null)}>
        {detail.isLoading && <TableSkeleton cols={4} />}
        {detail.data && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <Info label={t('sale.invoiceNo')} value={detail.data.invoiceNo} latin />
              <Info label={t('common.date')} value={displayDate(detail.data.purchaseDate)} latin />
              <Info label={t('purchase.supplier')} value={detail.data.supplierName ?? '-'} />
            </div>

            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.product')}</th>
                  <th className="cell text-end">{t('sale.quantity')}</th>
                  <th className="cell text-end">{t('product.purchasePrice')}</th>
                  <th className="cell text-end">{t('sale.total')}</th>
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
                    <td className="cell latin text-end">{money(item.unitCost)}</td>
                    <td className="cell latin text-end">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <Line label={t('sale.subtotal')} value={money(detail.data.subTotal)} />
                <Line label={t('sale.discount')} value={money(detail.data.discount)} />
                <Line label={t('sale.grandTotal')} value={money(detail.data.totalAmount)} bold />
                <Line label={t('purchase.paid')} value={money(detail.data.paidAmount)} />
                <Line label={t('purchase.balance')} value={money(detail.data.balance)} />
              </div>
            </div>
          </div>
        )}
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
