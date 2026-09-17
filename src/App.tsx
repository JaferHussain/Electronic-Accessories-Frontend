import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './hooks/useAuth'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { PurchaseList } from './pages/PurchaseList'
import { PurchaseNew } from './pages/PurchaseNew'
import { SaleList } from './pages/SaleList'
import { SaleNew } from './pages/SaleNew'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'

function RequireAuth({ children, adminOnly }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/sales" element={<SaleList />} />
        <Route path="/sales/new" element={<SaleNew />} />
        <Route
          path="/purchases"
          element={
            <RequireAuth adminOnly>
              <PurchaseList />
            </RequireAuth>
          }
        />
        <Route
          path="/purchases/new"
          element={
            <RequireAuth adminOnly>
              <PurchaseNew />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth adminOnly>
              <Reports />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth adminOnly>
              <Settings />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
