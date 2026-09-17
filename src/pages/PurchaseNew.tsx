import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, Save, Plus } from 'lucide-react'
import { errorMessage, getData, postData } from '../lib/api'
import { money, today } from '../lib/format'
import { useT } from '../i18n'
import { ProductPicker } from '../components/ProductPicker'
import type { ProductSearchItem, PurchaseDetail, Supplier } from '../lib/types'

interface Line {
  productId: number
  name: string
  model: string | null
  code: string
  currentStock: number
  quantity: number
  unitCost: number
}

export function PurchaseNew() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [lines, setLines] = useState<Line[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [discount, setDiscount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [newSupplier, setNewSupplier] = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)

  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => getData<Supplier[]>('/suppliers') })

  const subTotal = useMemo(() => lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0), [lines])
  const total = Math.max(0, subTotal - discount)
  const balance = total - paidAmount

  function addProduct(product: ProductSearchItem) {
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
          currentStock: product.quantityInStock,
          quantity: 1,
          unitCost: product.purchasePrice,
        },
      ]
    })
  }

  function updateLine(productId: number, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, ...patch } : l)))
  }

  const createSupplier = useMutation({
    mutationFn: (name: string) => postData<Supplier>('/suppliers', { name, openingBalance: 0, isActive: true }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setSupplierId(String(response.data.id))
      setAddingSupplier(false)
      setNewSupplier('')
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const save = useMutation({
    mutationFn: () =>
      postData<PurchaseDetail>('/purchases', {
        supplierId: supplierId ? Number(supplierId) : null,
        purchaseDate,
        discount,
        paidAmount,
        notes: notes.trim() || null,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      }),
    onSuccess: async (response) => {
      const addedUnits = lines.reduce((sum, l) => sum + l.quantity, 0)
      toast.success(`${response.message} — ${response.data.invoiceNo} (${t('purchase.stockAdded', addedUnits)})`)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      navigate('/purchases')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const invalid = lines.some((l) => l.quantity <= 0 || l.unitCost < 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('nav.newPurchase')}</h1>

      <div className="card grid gap-4 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="label">{t('purchase.supplier')}</label>
            <button className="mb-1 text-xs text-brand-600" onClick={() => setAddingSupplier((v) => !v)}>
              {addingSupplier ? t('common.closeShort') : t('purchase.newSupplier')}
            </button>
          </div>

          {addingSupplier ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                className="field"
                placeholder={t('purchase.supplierPlaceholder')}
              />
              <button
                className="btn-primary"
                disabled={!newSupplier.trim() || createSupplier.isPending}
                onClick={() => createSupplier.mutate(newSupplier.trim())}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="field">
              <option value="">{t('common.select')}</option>
              {suppliers.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label">{t('common.date')}</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="field latin"
          />
        </div>
      </div>

      <div className="card p-4">
        <ProductPicker onPick={addProduct} placeholder={t('picker.placeholder')} autoFocus />
      </div>

      <div className="card overflow-hidden">
        {lines.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">{t('purchase.noItems')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('sale.product')}</th>
                  <th className="cell text-end">{t('purchase.currentStock')}</th>
                  <th className="cell text-center">{t('sale.quantity')}</th>
                  <th className="cell text-end">{t('product.purchasePrice')}</th>
                  <th className="cell text-end">{t('sale.total')}</th>
                  <th className="cell" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.productId} className="border-t border-slate-100">
                    <td className="cell">
                      <p className="latin font-medium">{line.name}</p>
                      <p className="latin text-xs text-slate-500">
                        {[line.model, line.code].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="cell latin text-end text-slate-500">{line.currentStock}</td>
                    <td className="cell">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.productId, { quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="field mx-auto w-20 py-1 text-center"
                      />
                    </td>
                    <td className="cell">
                      <input
                        type="number"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.productId, { unitCost: Number(e.target.value) || 0 })}
                        className="field w-28 py-1 text-end"
                      />
                    </td>
                    <td className="cell latin text-end font-medium">{money(line.unitCost * line.quantity)}</td>
                    <td className="cell text-end">
                      <button
                        onClick={() => setLines((c) => c.filter((l) => l.productId !== line.productId))}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <label className="label">{t('purchase.notes')}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="field" />
          <p className="mt-2 text-xs text-slate-500">
            {t('purchase.saveNote')}
          </p>
        </div>

        <div className="card space-y-3 p-4 text-sm">
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">{t('purchase.paid')}</span>
            <input
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
              className="field w-28 py-1 text-end"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('purchase.balance')}</span>
            <span className="latin">{money(balance)}</span>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={lines.length === 0 || invalid || save.isPending}
            className="btn-primary w-full py-3"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? t('common.saving') : t('purchase.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
