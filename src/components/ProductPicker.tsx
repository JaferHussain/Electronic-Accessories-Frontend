import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { getData } from '../lib/api'
import { cx, money } from '../lib/format'
import { useDebounce } from '../hooks/useDebounce'
import { useT } from '../i18n'
import type { ProductSearchItem } from '../lib/types'

/**
 * Search-or-scan box shared by the sale and purchase screens.
 * A barcode scanner types the code then presses Enter, which is handled as an exact lookup.
 */
export function ProductPicker({
  onPick,
  placeholder,
  autoFocus,
  inputRef,
}: {
  onPick: (product: ProductSearchItem) => void
  placeholder?: string
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
}) {
  const t = useT()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const debounced = useDebounce(term, 300)
  const boxRef = useRef<HTMLDivElement>(null)
  const localRef = useRef<HTMLInputElement>(null)
  const field = inputRef ?? localRef

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['product-search', debounced],
    queryFn: () => getData<ProductSearchItem[]>('/products/search', { q: debounced, take: 12 }),
    enabled: debounced.trim().length > 0,
  })

  useEffect(() => setHighlight(0), [results])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function pick(product: ProductSearchItem) {
    onPick(product)
    setTerm('')
    setOpen(false)
    field.current?.focus()
  }

  async function handleEnter() {
    const raw = term.trim()
    if (!raw) return

    // A scanner's exact barcode wins over whatever the list is showing.
    const exact = results.find((r) => r.barcode === raw || r.code === raw)
    if (exact) return pick(exact)

    if (results.length > 0) return pick(results[highlight] ?? results[0])

    try {
      const scanned = await getData<ProductSearchItem>(`/products/barcode/${encodeURIComponent(raw)}`)
      pick(scanned)
    } catch {
      // No match - leave the text in place so the user can correct it.
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={field}
          autoFocus={autoFocus}
          value={term}
          placeholder={placeholder ?? t('picker.placeholder')}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleEnter()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((h) => Math.min(h + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((h) => Math.max(h - 1, 0))
            }
          }}
          className="field ps-9"
        />
      </div>

      {open && term.trim().length > 0 && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto card p-1">
          {isFetching && results.length === 0 && <p className="p-3 text-sm text-slate-400">{t('picker.searching')}</p>}
          {!isFetching && results.length === 0 && <p className="p-3 text-sm text-slate-400">{t('picker.noResults')}</p>}

          {results.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(product)}
              className={cx(
                'flex w-full items-center gap-3 rounded-lg p-2 text-start',
                index === highlight ? 'bg-brand-50' : 'hover:bg-slate-50',
              )}
            >
              {product.imagePath ? (
                <img src={product.imagePath} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="latin truncate text-sm font-medium">{product.name}</p>
                <p className="latin truncate text-xs text-slate-500">
                  {[product.brandName, product.model, product.code].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="text-end">
                <p className="latin text-sm">{money(product.retailPrice)}</p>
                <p
                  className={cx(
                    'latin text-xs',
                    product.quantityInStock <= 0
                      ? 'text-red-600'
                      : product.quantityInStock <= product.lowStockThreshold
                        ? 'text-amber-600'
                        : 'text-slate-500',
                  )}
                >
                  {product.quantityInStock}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
