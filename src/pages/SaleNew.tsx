import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Minus, Plus, Trash2, Save, AlertTriangle } from 'lucide-react'
import { errorMessage, getData, postData } from '../lib/api'
import { cx, money } from '../lib/format'
import { useT } from '../i18n'
import { ProductPicker } from '../components/ProductPicker'
import { Modal } from '../components/ui'
import { ReceiptView } from './ReceiptView'
import type { PaymentMethod, ProductSearchItem, Receipt, SaleDetail, SaleType } from '../lib/types'

interface CartLine {
  productId: number
  name: string
  model: string | null
  code: string
  available: number
  unitPrice: number
  retailPrice: number
  wholesalePrice: number
  /** Current purchase price - used only for the live profit estimate on screen.
   *  The authoritative cost is snapshotted server-side when the sale is saved. */
  costPrice: number
  quantity: number
}

export function SaleNew() {
  const t = useT()
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const [lines, setLines] = useState<CartLine[]>([])
  const [saleType, setSaleType] = useState<SaleType>(1)
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(1)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const subTotal = useMemo(() => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [lines])
  const total = Math.max(0, subTotal - discount)
  const grossProfit = useMemo(
    () => lines.reduce((sum, l) => sum + (l.unitPrice - l.costPrice) * l.quantity, 0),
    [lines],
  )
  const liveProfit = grossProfit - discount
  const overstocked = lines.filter((l) => l.quantity > l.available)

  const addProduct = useCallback(
    (product: ProductSearchItem) => {
      setLines((current) => {
        const existing = current.find((l) => l.productId === product.id)
        if (existing) {
          return current.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        }
        return [
          ...current,
          {
            productId: product.id,
            name: product.name,
            model: product.model,
            code: product.code,
            available: product.quantityInStock,
            retailPrice: product.retailPrice,
            wholesalePrice: product.wholesalePrice,
            costPrice: product.purchasePrice,
            unitPrice: saleType === 2 ? product.wholesalePrice : product.retailPrice,
            quantity: 1,
          },
        ]
      })
    },
    [saleType],
  )

  // Switching retail/wholesale re-fills prices the user hasn't overridden.
  function switchSaleType(next: SaleType) {
    setSaleType(next)
    setLines((current) =>
      current.map((line) => {
        const wasDefault = line.unitPrice === (saleType === 2 ? line.wholesalePrice : line.retailPrice)
        if (!wasDefault) return line
        return { ...line, unitPrice: next === 2 ? line.wholesalePrice : line.retailPrice }
      }),
    )
  }

  function updateLine(productId: number, patch: Partial<CartLine>) {
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, ...patch } : l)))
  }

  function removeLine(productId: number) {
    setLines((current) => current.filter((l) => l.productId !== productId))
  }

  const save = useMutation({
    mutationFn: async () => {
      const response = await postData<SaleDetail>('/sales', {
        saleType,
        discount,
        paymentMethod,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
      })
      const printable = await getData<Receipt>(`/sales/${response.data.id}/receipt`)
      return { response, printable }
    },
    onSuccess: async ({ response, printable }) => {
      toast.success(`${response.message} — ${response.data.invoiceNo}`)
      setReceipt(printable)
      resetCart()
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  function resetCart() {
    setLines([])
    setDiscount(0)
    setCustomerName('')
    setCustomerPhone('')
    searchRef.current?.focus()
  }

  const canSave = lines.length > 0 && overstocked.length === 0 && !save.isPending

  // F2 focus search, F9 save, Esc clear cart.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'F2') {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (event.key === 'F9') {
        event.preventDefault()
        if (canSave) save.mutate()
      } else if (event.key === 'Escape' && lines.length > 0) {
        event.preventDefault()
        resetCart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canSave, lines.length, save])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.newSale')}</h1>
        <p className="text-xs text-slate-500">
          {t('sale.shortcuts', 'F2', 'F9', 'Esc')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cart */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-4">
            <ProductPicker onPick={addProduct} autoFocus inputRef={searchRef} />
          </div>

          <div className="card overflow-hidden">
            {lines.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">
                {t('sale.cartEmpty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="cell text-start">{t('sale.product')}</th>
                      <th className="cell text-center">{t('sale.quantity')}</th>
                      <th className="cell text-end">{t('sale.unitPrice')}</th>
                      <th className="cell text-end">{t('sale.total')}</th>
                      <th className="cell" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const tooMany = line.quantity > line.available
                      return (
                        <tr key={line.productId} className={cx('border-t border-slate-100', tooMany && 'bg-red-50')}>
                          <td className="cell">
                            <p className="latin font-medium">{line.name}</p>
                            <p className="latin text-xs text-slate-500">
                              {[line.model, line.code].filter(Boolean).join(' · ')} — {t('sale.available', line.available)}
                            </p>
                            {tooMany && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                {t('sale.insufficient', line.available)}
                              </p>
                            )}
                          </td>
                          <td className="cell">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                className="rounded border border-slate-300 p-1 hover:bg-slate-50"
                                onClick={() =>
                                  updateLine(line.productId, { quantity: Math.max(1, line.quantity - 1) })
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                value={line.quantity}
                                min={1}
                                onChange={(e) =>
                                  updateLine(line.productId, { quantity: Math.max(1, Number(e.target.value) || 1) })
                                }
                                className="field w-16 py-1 text-center"
                              />
                              <button
                                className="rounded border border-slate-300 p-1 hover:bg-slate-50"
                                onClick={() => updateLine(line.productId, { quantity: line.quantity + 1 })}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="cell">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(line.productId, { unitPrice: Number(e.target.value) || 0 })}
                              className="field w-28 py-1 text-end"
                            />
                          </td>
                          <td className="cell latin text-end font-medium">{money(line.unitPrice * line.quantity)}</td>
                          <td className="cell text-end">
                            <button
                              onClick={() => removeLine(line.productId)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="card space-y-4 p-4">
            <div>
              <label className="label">{t('sale.rateType')}</label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                <button
                  onClick={() => switchSaleType(1)}
                  className={cx('flex-1 py-2 text-sm', saleType === 1 ? 'bg-brand-500 text-white' : 'bg-white')}
                >
                  {t('sale.retail')}
                </button>
                <button
                  onClick={() => switchSaleType(2)}
                  className={cx('flex-1 py-2 text-sm', saleType === 2 ? 'bg-brand-500 text-white' : 'bg-white')}
                >
                  {t('sale.wholesale')}
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('sale.subtotal')}</span>
                <span className="latin">{money(subTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{t('sale.discount')}</span>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="field w-28 py-1 text-end"
                />
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold">
                <span>{t('sale.grandTotal')}</span>
                <span className="latin">{money(total)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span className="text-emerald-700">{t('sale.expectedProfit')}</span>
                <span className={cx('latin font-semibold', liveProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {money(liveProfit)}
                </span>
              </div>
            </div>

            <div>
              <label className="label">{t('sale.paymentMethod')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(Number(e.target.value) as PaymentMethod)}
                className="field"
              >
                <option value={1}>{t('pay.cash')}</option>
                <option value={2}>{t('pay.easypaisa')}</option>
                <option value={3}>{t('pay.credit')}</option>
              </select>
            </div>

            <div>
              <label className="label">{t('sale.customerName')}</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="field" />
            </div>

            <div>
              <label className="label">{t('sale.customerPhone')}</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="field latin"
                placeholder="03xx-xxxxxxx"
              />
            </div>

            {overstocked.length > 0 && (
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {t('sale.overstockWarning')}
              </p>
            )}

            <button onClick={() => save.mutate()} disabled={!canSave} className="btn-primary w-full py-3">
              <Save className="h-4 w-4" />
              {save.isPending ? t('common.saving') : t('sale.saveInvoice')}
            </button>
          </div>
        </div>
      </div>

      <Modal open={receipt !== null} title={t('receipt.title')} onClose={() => setReceipt(null)}>
        {receipt && (
          <ReceiptView
            receipt={receipt}
            onNew={() => {
              setReceipt(null)
              searchRef.current?.focus()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
