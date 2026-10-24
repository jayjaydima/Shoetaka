import { Link } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { money } from '../data/products.js'

function Notifications() {
  const { notifications, unreadNotifications, markNotificationsRead } = useCart()
  const { mode } = useUser()

  function iconFor(type) {
    if (type === 'order') return 'bi-bag-check'
    if (type === 'cancel') return 'bi-x-circle'
    return 'bi-arrow-repeat'
  }

  function markAll() {
    markNotificationsRead()
  }

  return (
    <div className="app active">
      <Nav />
      <main className="store-wrap">
        <div className="market-head">
          <div>
            <p className="market-kicker">{mode === 'seller' ? 'SELLER MODE' : 'CUSTOMER MODE'}</p>
            <h1>Notifications</h1>
            <p className="text-muted mb-0">
              {mode === 'seller'
                ? 'Stay updated when customers interact with your shop.'
                : 'Stay updated about your orders and account.'}
            </p>
          </div>
          {unreadNotifications > 0 && (
            <button className="btn-ghost" onClick={markAll}>Mark all as read</button>
          )}
        </div>

        <div className="notification-panel mt-4">
          {notifications.length === 0 ? (
            <div className="seller-empty">
              <i className="bi bi-bell-slash"></i>
              <h2>No notifications</h2>
              <p>New updates will appear here.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <Link
                to={item.orderId ? '/orders' : '/notifications'}
                className={`notification-row ${item.read ? '' : 'unread'}`}
                key={item.id}
                onClick={() => !item.read && markNotificationsRead([item.id])}
              >
                <div className="notification-icon">
                  <i className={`bi ${iconFor(item.type)}`}></i>
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between gap-3">
                    <strong>{item.title}</strong>
                    <span className="small text-muted">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p>{item.message}</p>
                  {item.amount != null && (
                    <span className="small fw-bold">{money(item.amount)}</span>
                  )}
                </div>
                {!item.read && <span className="notification-dot"></span>}
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

export default Notifications
