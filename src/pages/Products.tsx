import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, LayoutGrid, List, Pencil, Trash2, PackageSearch } from 'lucide-react'
import { deleteData, errorMessage, getData, postData } from '../lib/api'
import { cx, money, number } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { EmptyState, Modal, Pager, TableSkeleton, Badge } from '../components/ui'
import { ProductForm } from './ProductForm'
import type { Lookup, PagedResult, Product } from '../lib/types'

export function Products() {
  const { isAdmin } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const [view, setView] = useState<'table' | 'cards'>('table')
  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [adjusting, setAdjusting] = useState<Product | null>(null)

  const search = params.get('search') ?? ''
  const brandId = params.get('brandId') ?? ''
  const categoryId = params.get('categoryId') ?? ''
  const lowStockOnly = params.get('lowStockOnly') === 'true'
  const page = Number(params.get('page') ?? 1)

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const brands = useQuery({ queryKey: ['brands'], queryFn: () => getData<Lookup[]>('/brands') })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<Lookup[]>('/categories') })

  const products = useQuery({
    queryKey: ['products', { search, brandId, categoryId, lowStockOnly, page }],
    queryFn: () =>
      getData<PagedResult<Product>>('/products', {
        search: search || undefined,
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        lowStockOnly: lowStockOnly || undefined,
        page,
        pageSize: 20,
      }),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteData(`/products/${id}`),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const rows = products.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t('nav.products')}</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              onClick={() => setView('table')}
              className={cx('px-3 py-2', view === 'table' ? 'bg-brand-50 text-brand-700' : 'bg-white')}
              aria-label={t('products.tableView')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('cards')}
              className={cx('px-3 py-2', view === 'cards' ? 'bg-brand-50 text-brand-700' : 'bg-white')}
              aria-label={t('products.cardView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              {t('products.add')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">{t('common.search')}</label>
          <input
            defaultValue={search}
            onChange={(e) => setParam('search', e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="field latin"
          />
        </div>
        <div>
          <label className="label">{t('product.brand')}</label>
          <select value={brandId} onChange={(e) => setParam('brandId', e.target.value)} className="field latin">
            <option value="">{t('products.allBrands')}</option>
            {brands.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('product.category')}</label>
          <select value={categoryId} onChange={(e) => setParam('categoryId', e.target.value)} className="field latin">
            <option value="">{t('products.allCategories')}</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setParam('lowStockOnly', e.target.checked ? 'true' : null)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">{t('products.lowStockOnly')}</span>
        </label>
      </div>

      <div className="card overflow-hidden">
        {products.isLoading ? (
          <TableSkeleton cols={8} rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('products.none')} hint={t('products.noneHint')} />
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="cell text-start">{t('product.image')}</th>
                  <th className="cell text-start">{t('product.name')}</th>
                  <th className="cell text-start">{t('product.brand')}</th>
                  <th className="cell text-start">{t('product.model')}</th>
                  <th className="cell text-end">{t('product.purchasePrice')}</th>
                  <th className="cell text-end">{t('product.wholesalePrice')}</th>
                  <th className="cell text-end">{t('product.retailPrice')}</th>
                  <th className="cell text-end">{t('product.totalPurchased')}</th>
                  <th className="cell text-end">{t('product.sold')}</th>
                  <th className="cell text-end">{t('product.remaining')}</th>
                  <th className="cell text-end">{t('product.profitPerUnit')}</th>
                  {isAdmin && <th className="cell text-end">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <tr key={product.id} className={cx('border-t border-slate-100', product.isLowStock && 'bg-red-50')}>
                    <td className="cell">
                      {product.imagePath ? (
                        <img src={product.imagePath} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="cell">
                      <p className="latin font-medium">{product.name}</p>
                      <p className="latin text-xs text-slate-400">{product.code}</p>
                    </td>
                    <td className="cell latin">{product.brandName ?? '-'}</td>
                    <td className="cell latin">{product.model ?? '-'}</td>
                    <td className="cell latin text-end">{money(product.purchasePrice)}</td>
                    <td className="cell latin text-end">{money(product.wholesalePrice)}</td>
                    <td className="cell latin text-end">{money(product.retailPrice)}</td>
                    <td className="cell latin text-end text-slate-500">{number(product.totalPurchased)}</td>
                    <td className="cell latin text-end text-slate-500">{number(product.totalSold)}</td>
                    <td className="cell latin text-end">
                      <span className={cx('font-semibold', product.isLowStock && 'text-red-600')}>
                        {number(product.quantityInStock)}
                      </span>
                      {product.isLowStock && (
                        <span className="ms-2">
                          <Badge tone="red">{t('product.low')}</Badge>
                        </span>
                      )}
                    </td>
                    <td
                      className={cx(
                        'cell latin text-end',
                        product.profitPerUnit >= 0 ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {money(product.profitPerUnit)}
                    </td>
                    {isAdmin && (
                      <td className="cell">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setAdjusting(product)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                            title={t('stock.adjust')}
                          >
                            <PackageSearch className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditing(product)
                              setFormOpen(true)
                            }}
                            className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                            title={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t('products.confirmDelete', product.name))) remove.mutate(product.id)
                            }}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((product) => (
              <div
                key={product.id}
                className={cx('rounded-xl border p-3', product.isLowStock ? 'border-red-300 bg-red-50' : 'border-slate-200')}
              >
                {product.imagePath ? (
                  <img src={product.imagePath} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-3 h-32 w-full rounded-lg bg-slate-100" />
                )}
                <p className="latin truncate font-medium">{product.name}</p>
                <p className="latin truncate text-xs text-slate-500">
                  {[product.brandName, product.model].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('sale.retail')}</span>
                    <span className="latin">{money(product.retailPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('sale.wholesale')}</span>
                    <span className="latin">{money(product.wholesalePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('product.profit')}</span>
                    <span className="latin text-emerald-600">{money(product.profitPerUnit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('product.remainingShort')}</span>
                    <span className={cx('latin font-semibold', product.isLowStock && 'text-red-600')}>
                      {number(product.quantityInStock)}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    className="btn-ghost mt-3 w-full"
                    onClick={() => {
                      setEditing(product)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    {t('common.edit')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {products.data && (
          <Pager
            page={products.data.page}
            totalPages={products.data.totalPages}
            totalCount={products.data.totalCount}
            onChange={(next) => setParam('page', String(next))}
          />
        )}
      </div>

      <Modal
        open={formOpen}
        wide
        title={editing ? t('products.formEdit') : t('products.formAdd')}
        onClose={() => setFormOpen(false)}
      >
        {formOpen && <ProductForm product={editing} onDone={() => setFormOpen(false)} />}
      </Modal>

      <AdjustStockModal product={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  )
}

function AdjustStockModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const adjust = useMutation({
    mutationFn: () =>
      postData(`/products/${product!.id}/adjust-stock`, { newQuantity: Number(quantity), reason }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(response.message)
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <Modal open={product !== null} title={t('stock.adjust')} onClose={onClose}>
      {product && (
        <div className="space-y-4">
          <p className="latin text-sm text-slate-600">
            {t('stock.currentQty', product.name)} <strong>{product.quantityInStock}</strong>
          </p>
          <div>
            <label className="label">{t('stock.countedQty')}</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="field"
              autoFocus
            />
          </div>
          <div>
            <label className="label">{t('stock.reason')}</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="field" placeholder={t('stock.reasonPlaceholder')} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              disabled={quantity === '' || adjust.isPending}
              onClick={() => adjust.mutate()}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
