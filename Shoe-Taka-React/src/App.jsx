import { Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { CartProvider } from './context/CartContext.jsx'

import RequireAuth from './components/RequireAuth.jsx'
import RequireAdminAuth from './components/RequireAdminAuth.jsx'
import FullPageLoader from './components/FullPageLoader.jsx'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Store from './pages/Store.jsx'
import Cart from './pages/Cart.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import Profile from './pages/Profile.jsx'
import Orders from './Orders.jsx'
import Notifications from './pages/Notifications.jsx'

import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'

function GuestOnly({ children }) {
  // Wait for the Firestore role too (loading), not just Firebase Auth.
  // Otherwise a Google sign-in redirects before the role is known and an
  // admin ends up on the student pages.
  const { loading, firebaseUser, isAdmin, isStudent } = useUser()

  if (loading) return <FullPageLoader />

  if (firebaseUser) {
    if (isAdmin) return <Navigate to="/admin" replace />
    if (isStudent) return <Navigate to="/student" replace />
    return <Navigate to="/store" replace />
  }

  return children
}

function StudentOrAdmin() {
  const { isAdmin } = useUser()
  return isAdmin ? <Navigate to="/admin" replace /> : <StudentDashboard />
}

function App() {
  return (
    <UserProvider>
      <ProductsProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/products" element={<Store />} />

            <Route
              path="/login"
              element={
                <GuestOnly>
                  <Login initialMode="login" />
                </GuestOnly>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestOnly>
                  <Login initialMode="signup" />
                </GuestOnly>
              }
            />

            <Route
              path="/cart"
              element={
                <RequireAuth>
                  <Cart />
                </RequireAuth>
              }
            />

            <Route
              path="/student"
              element={
                <RequireAuth>
                  <StudentOrAdmin />
                </RequireAuth>
              }
            />

            <Route
              path="/dashboard"
              element={<Navigate to="/student" replace />}
            />

            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />

            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <Orders />
                </RequireAuth>
              }
            />

            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <Notifications />
                </RequireAuth>
              }
            />

            <Route path="/Orders" element={<Navigate to="/orders" replace />} />

            <Route
              path="/admin"
              element={
                <RequireAdminAuth>
                  <AdminLayout />
                </RequireAdminAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </ProductsProvider>
    </UserProvider>
  )
}

export default App
