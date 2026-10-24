import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext.jsx'

// Admin uses the same top navigation bar and page layout as the student pages.
function AdminLayout() {
  const navigate = useNavigate()
  const { user, logout } = useUser()

  async function handleLogout() {
    await logout()
    navigate('/home', { replace: true })
  }

  const linkClass = ({ isActive }) => `nav-btn ${isActive ? 'active-view' : ''}`
  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'A'

  return (
    <div className="app active">
      <nav className="nav">
        <Link to="/admin" className="nav-logo text-decoration-none">
          <span className="dot"></span>
          Shoe Taka Admin
        </Link>

        <div className="nav-links">
          <NavLink to="/admin" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/products" className={linkClass}>
            Products
          </NavLink>
          <NavLink to="/admin/orders" className={linkClass}>
            Orders
          </NavLink>
          <span className="nav-avatar" title={user?.name || 'Admin'}>
            {initial}
          </span>
          <button className="nav-out" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      <main className="store-wrap">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
