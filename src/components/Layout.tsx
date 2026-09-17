import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, BarChart3, Settings as SettingsIcon,
  LogOut, Menu, Search, Store,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import { cx } from '../lib/format'
import { LanguageToggle } from './LanguageToggle'
import type { StringKey } from '../i18n/strings'

const NAV: { to: string; label: StringKey; icon: typeof LayoutDashboard; exact?: boolean; adminOnly: boolean }[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, exact: true, adminOnly: false },
  { to: '/products', label: 'nav.products', icon: Package, adminOnly: false },
  { to: '/sales/new', label: 'nav.newSale', icon: ShoppingCart, adminOnly: false },
  { to: '/sales', label: 'nav.sales', icon: Receipt, adminOnly: false },
  { to: '/purchases/new', label: 'nav.newPurchase', icon: ShoppingCart, adminOnly: true },
  { to: '/purchases', label: 'nav.purchases', icon: Receipt, adminOnly: true },
  { to: '/reports', label: 'nav.reports', icon: BarChart3, adminOnly: true },
  { to: '/settings', label: 'nav.settings', icon: SettingsIcon, adminOnly: true },
]

export function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const { t, isUrdu } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const items = NAV.filter((item) => !item.adminOnly || isAdmin)

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const term = search.trim()
    if (term) navigate(`/products?search=${encodeURIComponent(term)}`)
  }

  // The sidebar sits on the trailing edge: right in Urdu (RTL), left in English (LTR).
  const closedOffset = isUrdu ? 'translate-x-full' : '-translate-x-full'

  return (
    <div className="min-h-screen bg-slate-100">
      <aside
        className={cx(
          'fixed inset-y-0 end-0 z-40 w-64 border-s border-slate-200 bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : `${closedOffset} lg:translate-x-0`,
        )}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <Store className="h-6 w-6 shrink-0 text-brand-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t('shop.name')}</p>
            <p className="truncate text-xs text-slate-500">{t('shop.address')}</p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 p-3">
          <p className="px-2 text-sm">{user?.fullName || user?.username}</p>
          <p className="px-2 text-xs text-slate-500">{user?.role === 'Admin' ? t('role.admin') : t('role.salesman')}</p>
          <button onClick={logout} className="btn-ghost mt-2 w-full">
            <LogOut className="h-4 w-4" />
            {t('auth.logout')}
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:me-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              className="rounded p-2 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={t('common.menu')}
            >
              <Menu className="h-5 w-5" />
            </button>

            <form onSubmit={submitSearch} className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('nav.globalSearch')}
                className="field ps-9"
              />
            </form>

            <LanguageToggle className="shrink-0" />
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
