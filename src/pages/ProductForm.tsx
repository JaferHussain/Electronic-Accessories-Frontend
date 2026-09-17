import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { errorMessage, getData, postData, sendForm } from '../lib/api'
import { money } from '../lib/format'
import { useT, type Translate } from '../i18n'
import type { Lookup, Product } from '../lib/types'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

// Built per render so validation messages follow the selected language.
const buildSchema = (t: Translate) =>
  z.object({
    name: z.string().min(1, t('products.nameRequired')),
    brandId: z.string().optional(),
    categoryId: z.string().optional(),
    model: z.string().optional(),
    barcode: z.string().optional(),
    purchasePrice: z.coerce.number().min(0, t('products.negativePrice')),
    wholesalePrice: z.coerce.number().min(0, t('products.negativePrice')),
    retailPrice: z.coerce.number().min(0, t('products.negativePrice')),
    openingQuantity: z.coerce.number().int().min(0, t('products.negativeQty')),
    lowStockThreshold: z.coerce.number().int().min(0, t('products.negativeAlert')),
  })

type FormValues = z.input<ReturnType<typeof buildSchema>>

export function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const t = useT()
  const queryClient = useQueryClient()
  const isEdit = product !== null
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(product?.imagePath ?? null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const brands = useQuery({ queryKey: ['brands'], queryFn: () => getData<Lookup[]>('/brands') })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<Lookup[]>('/categories') })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      name: product?.name ?? '',
      brandId: product?.brandId ? String(product.brandId) : '',
      categoryId: product?.categoryId ? String(product.categoryId) : '',
      model: product?.model ?? '',
      barcode: product?.barcode ?? '',
      purchasePrice: product?.purchasePrice ?? 0,
      wholesalePrice: product?.wholesalePrice ?? 0,
      retailPrice: product?.retailPrice ?? 0,
      openingQuantity: 0,
      lowStockThreshold: product?.lowStockThreshold ?? 5,
    },
  })

  // Live profit indicator, recalculated as the user types.
  const purchasePrice = Number(watch('purchasePrice') || 0)
  const retailPrice = Number(watch('retailPrice') || 0)
  const wholesalePrice = Number(watch('wholesalePrice') || 0)
  const retailProfit = retailPrice - purchasePrice
  const wholesaleProfit = wholesalePrice - purchasePrice

  useEffect(() => {
    // Revoke object URLs so previews don't leak between opens of the modal.
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function acceptFile(picked: File | undefined) {
    if (!picked) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      toast.error(t('products.wrongImageType'))
      return
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      toast.error(t('products.imageTooBig'))
      return
    }
    setFile(picked)
    setRemoveImage(false)
    setPreview(URL.createObjectURL(picked))
  }

  const createBrand = useMutation({
    mutationFn: (name: string) => postData<Lookup>('/brands', { name }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['brands'] })
      setValue('brandId', String(response.data.id))
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const createCategory = useMutation({
    mutationFn: (name: string) => postData<Lookup>('/categories', { name }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      setValue('categoryId', String(response.data.id))
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const form = new FormData()
      form.append('Name', String(values.name))
      if (values.brandId) form.append('BrandId', String(values.brandId))
      if (values.categoryId) form.append('CategoryId', String(values.categoryId))
      if (values.model) form.append('Model', String(values.model))
      if (values.barcode) form.append('Barcode', String(values.barcode))
      form.append('PurchasePrice', String(values.purchasePrice))
      form.append('WholesalePrice', String(values.wholesalePrice))
      form.append('RetailPrice', String(values.retailPrice))
      form.append('OpeningQuantity', String(values.openingQuantity ?? 0))
      form.append('LowStockThreshold', String(values.lowStockThreshold))
      form.append('RemoveImage', String(removeImage))
      if (file) form.append('Image', file)

      return isEdit
        ? sendForm<Product>(`/products/${product!.id}`, form, 'put')
        : sendForm<Product>('/products', form, 'post')
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(response.message)
      onDone()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} className="space-y-4">
      {/* Image */}
      <div>
        <label className="label">{t('product.image')}</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            acceptFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => fileInput.current?.click()}
          className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed border-slate-300 p-4 hover:border-brand-400"
        >
          {preview ? (
            <img src={preview} alt="" className="h-20 w-20 rounded object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded bg-slate-100">
              <ImagePlus className="h-6 w-6 text-slate-400" />
            </div>
          )}
          <div className="flex-1 text-sm text-slate-500">
            <p>{t('products.dropImage')}</p>
            <p className="text-xs">{t('products.imageHint')}</p>
          </div>
          {preview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
                setPreview(null)
                setRemoveImage(true)
              }}
              className="rounded p-2 text-red-500 hover:bg-red-50"
              aria-label={t('products.removeImage')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">{t('product.name')}</label>
          <input {...register('name')} className="field latin" placeholder="USB Cable Type-C 1M" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <CreatableSelect
          label={t('product.brand')}
          options={brands.data ?? []}
          value={watch('brandId') ?? ''}
          onChange={(value) => setValue('brandId', value)}
          onCreate={(name) => createBrand.mutate(name)}
        />

        <CreatableSelect
          label={t('product.category')}
          options={categories.data ?? []}
          value={watch('categoryId') ?? ''}
          onChange={(value) => setValue('categoryId', value)}
          onCreate={(name) => createCategory.mutate(name)}
        />

        <div>
          <label className="label">{t('product.model')}</label>
          <input {...register('model')} className="field latin" placeholder="33W Type-C" />
        </div>

        <div>
          <label className="label">{t('product.barcode')}</label>
          <input {...register('barcode')} className="field latin" placeholder={t('products.barcodePlaceholder')} />
        </div>

        <div>
          <label className="label">{t('product.purchasePrice')}</label>
          <input {...register('purchasePrice')} type="number" step="0.01" className="field" />
          {errors.purchasePrice && <p className="mt-1 text-xs text-red-600">{errors.purchasePrice.message}</p>}
        </div>

        <div>
          <label className="label">{t('product.wholesalePrice')}</label>
          <input {...register('wholesalePrice')} type="number" step="0.01" className="field" />
        </div>

        <div>
          <label className="label">{t('product.retailPrice')}</label>
          <input {...register('retailPrice')} type="number" step="0.01" className="field" />
        </div>

        <div>
          <label className="label">{t('products.profitRetail')}</label>
          <div className="field bg-slate-50">
            <span className={`latin ${retailProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {money(retailProfit)}
            </span>
            <span className="latin ms-2 text-xs text-slate-400">{t('products.profitWholesaleInline', money(wholesaleProfit))}</span>
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="label">{t('product.openingQty')}</label>
            <input {...register('openingQuantity')} type="number" className="field" />
            {errors.openingQuantity && <p className="mt-1 text-xs text-red-600">{errors.openingQuantity.message}</p>}
          </div>
        )}

        <div>
          <label className="label">{t('product.lowStockAlert')}</label>
          <input {...register('lowStockThreshold')} type="number" className="field" />
        </div>
      </div>

      {isEdit && (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{t('products.stockNote')}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className="btn-ghost">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={save.isPending} className="btn-primary">
          {save.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}

/** A select that can also create a new option inline. */
function CreatableSelect({
  label,
  options,
  value,
  onChange,
  onCreate,
}: {
  label: string
  options: Lookup[]
  value: string
  onChange: (value: string) => void
  onCreate: (name: string) => void
}) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  if (adding) {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (name.trim()) {
                  onCreate(name.trim())
                  setAdding(false)
                  setName('')
                }
              }
            }}
            className="field latin"
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setAdding(false)
              setName('')
            }}
          >
            {t('common.closeShort')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        <button type="button" onClick={() => setAdding(true)} className="mb-1 text-xs text-brand-600">
          {t('common.addNew')}
        </button>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field latin">
        <option value="">{t('common.select')}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}
