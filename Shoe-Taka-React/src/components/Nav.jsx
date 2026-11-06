import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'

function Nav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('shoe-taka-theme') || 'light')
  const { cartCount, unreadNotifications } = useCart()
  const { user, logout, mode, switchMode } = useUser()

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('shoe-taka-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }

  async function handleLogout() {
    await logout()
    navigate('/home', { replace: true })
  }

  function handleModeChange(nextMode) {
    switchMode(nextMode)
    setMenuOpen(false)
    navigate(nextMode === 'seller' ? '/dashboard' : '/store')
  }

  const initial = user?.name?.trim()?.charAt(0).toUpperCase() || '?'
  const displayName = user?.name?.trim() || 'My profile'

  return (
    <header className="site-nav-shell">
      <nav className="site-nav" aria-label="Main navigation">
        <Link to="/store" className="site-nav-brand" aria-label="Shoe Taka store home">
          <span className="site-nav-mark">S</span>
          <span className="site-nav-brand-copy">
            <strong>Shoe Taka</strong>
            <small>STEP INTO STYLE</small>
          </span>
        </Link>

        <div className="site-nav-desktop-links">
          {mode === 'customer' ? (
            <>
              <Link to="/store" className={`site-nav-link ${isActive('/store') ? 'is-active' : ''}`}>Store</Link>
              <button type="button" className="site-nav-sell" onClick={() => handleModeChange('seller')}>
                <i className="bi bi-shop-window" aria-hidden="true"></i>
                Sell Now
              </button>
              <Link to="/orders" className={`site-nav-link ${isActive('/orders') ? 'is-active' : ''}`}>Orders</Link>
              <Link to="/cart" className={`site-nav-link site-nav-cart ${isActive('/cart') ? 'is-active' : ''}`}>
                <i className="bi bi-bag" aria-hidden="true"></i>
                Cart
                <span className="site-nav-count">{cartCount}</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className={`site-nav-link ${isActive('/dashboard') ? 'is-active' : ''}`}>Dashboard</Link>
              <Link to="/orders" className={`site-nav-link ${isActive('/orders') ? 'is-active' : ''}`}>Orders</Link>
              <button type="button" className="site-nav-sell" onClick={() => handleModeChange('customer')}>
                <i className="bi bi-arrow-left-right" aria-hidden="true"></i>
                Customer View
              </button>
            </>
          )}
        </div>

        <div className="site-nav-actions">
          <button type="button" className="site-nav-theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} aria-hidden="true"></i>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <span className={`site-nav-role ${mode === 'seller' ? 'is-seller' : ''}`}>
            <span className="site-nav-role-dot"></span>
            {mode === 'seller' ? 'Seller' : 'Customer'}
          </span>

          <Link
            to="/notifications"
            className={`site-nav-icon-link ${isActive('/notifications') ? 'is-active' : ''}`}
            aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
          >
            <i className="bi bi-bell" aria-hidden="true"></i>
            {unreadNotifications > 0 && (
              <span className="site-nav-notification-count">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className={`site-nav-profile ${isActive('/profile') ? 'is-active' : ''}`}
            title={displayName}
          >
            <span className="site-nav-avatar">{initial}</span>
            <span className="site-nav-profile-name">{displayName}</span>
          </Link>

          <button type="button" className="site-nav-logout" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
            <span>Log out</span>
          </button>
        </div>

        <button
          type="button"
          className="site-nav-menu-toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="site-nav-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i className={menuOpen ? 'bi bi-x-lg' : 'bi bi-list'} aria-hidden="true"></i>
        </button>
      </nav>

      <div id="site-nav-mobile-menu" className={`site-nav-mobile-menu ${menuOpen ? 'is-open' : ''}`}>
        <div className="site-nav-mobile-primary">
          {mode === 'customer' ? (
            <>
              <Link to="/store" className={isActive('/store') ? 'is-active' : ''}><i className="bi bi-grid" />Store</Link>
              <button type="button" onClick={() => handleModeChange('seller')}><i className="bi bi-shop-window" />Sell Now</button>
              <Link to="/orders" className={isActive('/orders') ? 'is-active' : ''}><i className="bi bi-receipt" />Orders</Link>
              <Link to="/cart" className={isActive('/cart') ? 'is-active' : ''}><i className="bi bi-bag" />Cart <span className="site-nav-mobile-count">{cartCount}</span></Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className={isActive('/dashboard') ? 'is-active' : ''}><i className="bi bi-speedometer2" />Dashboard</Link>
              <Link to="/orders" className={isActive('/orders') ? 'is-active' : ''}><i className="bi bi-receipt" />Orders</Link>
              <button type="button" onClick={() => handleModeChange('customer')}><i className="bi bi-arrow-left-right" />Customer View</button>
            </>
          )}
        </div>
        <div className="site-nav-mobile-secondary">
          <button type="button" onClick={toggleTheme}><i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          <Link to="/notifications"><i className="bi bi-bell" />Notifications {unreadNotifications > 0 && <span className="site-nav-mobile-count">{unreadNotifications}</span>}</Link>
          <Link to="/profile"><i className="bi bi-person-circle" />My Profile</Link>
          <button type="button" onClick={handleLogout}><i className="bi bi-box-arrow-right" />Log out</button>
        </div>
      </div>
    </header>
  )
}

export default Nav
