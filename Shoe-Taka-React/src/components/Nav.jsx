import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'

function Nav() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    cartCount,
    unreadNotifications,
  } = useCart()
  const {
    user,
    logout,
    mode,
    switchMode,
  } = useUser()

  function isActive(path) {
    return location.pathname === path
  }

  async function handleLogout() {
    await logout()
    navigate('/home', { replace: true })
  }

  function handleModeChange(nextMode) {
    switchMode(nextMode)
    navigate(nextMode === 'seller' ? '/dashboard' : '/store')
  }

  const initial = user?.name
    ? user.name.trim().charAt(0).toUpperCase()
    : '?'

  return (
    <nav className="nav">
      <Link to="/store" className="nav-logo text-decoration-none">
        <span className="dot"></span>
        Shoe Taka
      </Link>

      <div className="nav-center">
        <div className="mode-switch" aria-label="Account mode">
          <button
            type="button"
            className={mode === 'customer' ? 'active' : ''}
            onClick={() => handleModeChange('customer')}
          >
            Customer
          </button>
          
        </div>
      </div>

      <div className="nav-links">
        {mode === 'customer' ? (
          <>
            <Link to="/store" className={`nav-btn ${isActive('/store') ? 'active-view' : ''}`}>
              Store
            </Link>
            
            <button
              type="button"
              className="nav-btn sell-now-btn"
              onClick={() => handleModeChange('seller')}
            >
              Sell Now
            </button>
            <Link to="/orders" className={`nav-btn ${isActive('/orders') ? 'active-view' : ''}`}>
              Orders
            </Link>
            <Link to="/cart" className="nav-btn cart-pill">
              Cart
              <span className="cart-count">{cartCount}</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`nav-btn ${isActive('/dashboard') ? 'active-view' : ''}`}>
              Seller Dashboard
            </Link>
            <Link to="/orders" className={`nav-btn ${isActive('/orders') ? 'active-view' : ''}`}>
              Orders
            </Link>
          </>
        )}

        <Link
          to="/notifications"
          className={`nav-btn nav-notification ${isActive('/notifications') ? 'active-view' : ''}`}
          title="Notifications"
        >
          <i className="bi bi-bell"></i>
          {unreadNotifications > 0 && (
            <span className="notification-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
          )}
        </Link>

        <Link
          to="/profile"
          className={`nav-avatar ${isActive('/profile') ? 'active-view' : ''}`}
          title={user?.name || 'Profile'}
        >
          {initial}
        </Link>

        <button className="nav-out" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </nav>
  )
}

export default Nav
