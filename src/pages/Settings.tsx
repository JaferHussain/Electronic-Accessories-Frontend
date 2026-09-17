import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Save, Trash2 } from 'lucide-react'
import { deleteData, errorMessage, getData, postData, putData } from '../lib/api'
import { cx } from '../lib/format'
import { useT } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Badge, TableSkeleton } from '../components/ui'
import type { Lookup, Supplier, User } from '../lib/types'

type Tab = 'shop' | 'brands' | 'categories' | 'suppliers' | 'users'

const TABS: { id: Tab; label: StringKey }[] = [
  { id: 'shop', label: 'settings.shop' },
  { id: 'brands', label: 'settings.brands' },
  { id: 'categories', label: 'settings.categories' },
  { id: 'suppliers', label: 'settings.suppliers' },
  { id: 'users', label: 'settings.users' },
]

export function Settings() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('shop')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('nav.settings')}</h1>

      <div className="flex flex-wrap gap-2">
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

      {tab === 'shop' && <ShopSettings />}
      {tab === 'brands' && <LookupManager kind="brands" titleKey="settings.brands" />}
      {tab === 'categories' && <LookupManager kind="categories" titleKey="settings.categories" />}
      {tab === 'suppliers' && <SupplierManager />}
      {tab === 'users' && <UserManager />}
    </div>
  )
}

const SHOP_FIELDS: { key: string; label: StringKey; latin?: boolean }[] = [
  { key: 'ShopName', label: 'settings.shopName' },
  { key: 'ShopAddress', label: 'settings.address' },
  { key: 'ShopPhone', label: 'settings.phone', latin: true },
  { key: 'ReceiptFooter', label: 'settings.receiptFooter' },
  { key: 'LowStockThreshold', label: 'settings.lowStockDefault', latin: true },
  { key: 'ReceiptWidth', label: 'settings.receiptWidth', latin: true },
]

function ShopSettings() {
  const t = useT()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => getData<Record<string, string | null>>('/settings'),
  })

  useEffect(() => {
    if (settings.data) {
      setValues(Object.fromEntries(Object.entries(settings.data).map(([k, v]) => [k, v ?? ''])))
    }
  }, [settings.data])

  const save = useMutation({
    mutationFn: () => putData('/settings', SHOP_FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? '' }))),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (settings.isLoading) return <div className="card"><TableSkeleton cols={2} /></div>

  return (
    <div className="card max-w-2xl space-y-4 p-4">
      {SHOP_FIELDS.map((field) => (
        <div key={field.key}>
          <label className="label">{t(field.label)}</label>
          <input
            value={values[field.key] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            className={cx('field', field.latin && 'latin')}
          />
        </div>
      ))}
      <p className="text-xs text-slate-500">{t('settings.receiptNote')}</p>
      <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="h-4 w-4" />
        {t('common.save')}
      </button>
    </div>
  )
}

function LookupManager({ kind, titleKey }: { kind: 'brands' | 'categories'; titleKey: StringKey }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const items = useQuery({
    queryKey: [kind, 'all'],
    queryFn: () => getData<Lookup[]>(`/${kind}`, { includeInactive: true }),
  })

  const create = useMutation({
    mutationFn: () => postData(`/${kind}`, { name }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: [kind] })
      setName('')
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteData(`/${kind}/${id}`),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: [kind] })
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="card max-w-2xl overflow-hidden">
      <div className="flex gap-2 border-b border-slate-200 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) create.mutate()
          }}
          placeholder={t('settings.newNamed', t(titleKey))}
          className="field latin"
        />
        <button className="btn-primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {items.isLoading ? (
        <TableSkeleton cols={3} />
      ) : (
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="cell text-start">{t('product.name')}</th>
              <th className="cell text-end">{t('settings.productsCount')}</th>
              <th className="cell text-end">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.data?.map((item) => (
              <tr key={item.id} className={cx('border-t border-slate-100', !item.isActive && 'opacity-50')}>
                <td className="cell latin">
                  {item.name}
                  {!item.isActive && (
                    <span className="ms-2">
                      <Badge>{t('common.inactive')}</Badge>
                    </span>
                  )}
                </td>
                <td className="cell latin text-end">{item.productCount}</td>
                <td className="cell text-end">
                  {item.isActive && (
                    <button
                      onClick={() => remove.mutate(item.id)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function SupplierManager() {
  const t = useT()
  const queryClient = useQueryClient()
  const empty = { id: 0, name: '', phone: '', address: '', openingBalance: 0, isActive: true }
  const [draft, setDraft] = useState<Supplier>(empty as Supplier)

  const suppliers = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => getData<Supplier[]>('/suppliers', { includeInactive: true }),
  })

  const save = useMutation({
    mutationFn: () => (draft.id ? putData(`/suppliers/${draft.id}`, draft) : postData('/suppliers', draft)),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setDraft(empty as Supplier)
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg">{draft.id ? t('settings.editSupplier') : t('settings.newSupplier')}</h2>
        <div>
          <label className="label">{t('product.name')}</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field" />
        </div>
        <div>
          <label className="label">{t('settings.phone')}</label>
          <input
            value={draft.phone ?? ''}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className="field latin"
          />
        </div>
        <div>
          <label className="label">{t('settings.address')}</label>
          <input
            value={draft.address ?? ''}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            className="field"
          />
        </div>
        <div>
          <label className="label">{t('settings.openingBalance')}</label>
          <input
            type="number"
            step="0.01"
            value={draft.openingBalance}
            onChange={(e) => setDraft({ ...draft, openingBalance: Number(e.target.value) || 0 })}
            className="field"
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={!draft.name.trim() || save.isPending} onClick={() => save.mutate()}>
            <Save className="h-4 w-4" />
            {t('common.save')}
          </button>
          {draft.id > 0 && (
            <button className="btn-ghost" onClick={() => setDraft(empty as Supplier)}>
              {t('common.new')}
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        {suppliers.isLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="cell text-start">{t('product.name')}</th>
                <th className="cell text-start">{t('settings.phone')}</th>
                <th className="cell text-start">{t('settings.address')}</th>
                <th className="cell text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.data?.map((supplier) => (
                <tr key={supplier.id} className={cx('border-t border-slate-100', !supplier.isActive && 'opacity-50')}>
                  <td className="cell">{supplier.name}</td>
                  <td className="cell latin">{supplier.phone ?? '-'}</td>
                  <td className="cell">{supplier.address ?? '-'}</td>
                  <td className="cell text-end">
                    <button className="text-sm text-brand-600" onClick={() => setDraft(supplier)}>
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function UserManager() {
  const t = useT()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'Admin' | 'Salesman'>('Salesman')

  const users = useQuery({ queryKey: ['users'], queryFn: () => getData<User[]>('/users') })

  const create = useMutation({
    mutationFn: () => postData('/users', { username, fullName, password, role }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setUsername('')
      setFullName('')
      setPassword('')
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const toggle = useMutation({
    mutationFn: (user: User) => putData(`/users/${user.id}`, { isActive: !user.isActive }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(response.message)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg">{t('settings.newUser')}</h2>
        <div>
          <label className="label">{t('auth.username')}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="field latin" />
        </div>
        <div>
          <label className="label">{t('settings.fullName')}</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="field" />
        </div>
        <div>
          <label className="label">{t('auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field latin"
          />
        </div>
        <div>
          <label className="label">{t('settings.role')}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'Admin' | 'Salesman')} className="field">
            <option value="Salesman">{t('role.salesman')}</option>
            <option value="Admin">{t('role.admin')}</option>
          </select>
        </div>
        <button
          className="btn-primary"
          disabled={!username.trim() || password.length < 4 || create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="h-4 w-4" />
          {t('settings.add')}
        </button>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        {users.isLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="cell text-start">{t('auth.username')}</th>
                <th className="cell text-start">{t('settings.fullName')}</th>
                <th className="cell text-start">{t('settings.role')}</th>
                <th className="cell text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((user) => (
                <tr key={user.id} className={cx('border-t border-slate-100', !user.isActive && 'opacity-50')}>
                  <td className="cell latin">{user.username}</td>
                  <td className="cell">{user.fullName ?? '-'}</td>
                  <td className="cell">{user.role === 'Admin' ? t('role.admin') : t('role.salesman')}</td>
                  <td className="cell text-end">
                    <button className="text-sm text-brand-600" onClick={() => toggle.mutate(user)}>
                      {user.isActive ? t('settings.deactivate') : t('settings.activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
