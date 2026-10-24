import { useState } from 'react'
import { Link } from 'react-router-dom'
import { money } from './data/products.js'
import { useCart, ORDER_STATUSES } from './context/CartContext.jsx'
import { useUser } from './context/UserContext.jsx'
import Nav from './components/Nav.jsx'

const STATUS_BADGE = {
  New: 'bg-dark text-white',
  Processing: 'bg-warning-subtle text-dark',
  Shipped: 'bg-info-subtle text-dark',
  Delivered: 'bg-success-subtle text-dark',
  Cancelled: 'bg-danger-subtle text-dark',
}

function CustomerOrders() {
  const { orders, cancelOrder } = useCart()
  const [error, setError] = useState('')

  async function handleCancel(id) {
    if (!window.confirm('Cancel this order?')) return
    setError('')
    try {
      await cancelOrder(id)
    } catch (err) {
      setError(err.message || 'Could not cancel this order.')
    }
  }

  return (
    <main className="store-wrap">
      <div className="market-head">
        <div>
          <p className="market-kicker">CUSTOMER MODE</p>
          <h1>My Orders</h1>
        </div>
        <Link to="/store" className="btn-ghost text-decoration-none">Continue Shopping</Link>
      </div>

      {error && <div className="alert alert-danger mt-4">{error}</div>}

      {orders.length === 0 ? (
        <div className="seller-empty mt-4">
          <i className="bi bi-receipt"></i>
          <h2>No orders yet</h2>
          <p>Your completed checkouts will appear here.</p>
          <Link to="/store" className="btn-primary text-decoration-none">Shop Now</Link>
        </div>
      ) : (
        <div className="order-stack mt-4">
          {orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="order-card-head">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <div className="small text-muted">{new Date(order.placedAt).toLocaleString()}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[order.status] || 'bg-secondary'}`}>
                  {order.status}
                </span>
              </div>

              <div className="order-items">
                {order.items.map((item) => (
                  <div className="order-item-row" key={item.id}>
                    <img src={item.img} alt={item.name} />
                    <div className="flex-grow-1">
                      <strong>{item.name}</strong>
                      <div className="small text-muted">
                        Size {item.size} · x{item.qty}
                      </div>
                    </div>
                    <strong>{money(item.price * item.qty)}</strong>
                  </div>
                ))}
              </div>

              <div className="order-card-footer">
                <span>Total</span>
                <strong>{money(order.total)}</strong>
              </div>

              {['New', 'Processing'].includes(order.status) && (
                <button className="btn btn-outline-danger btn-sm mt-3" onClick={() => handleCancel(order.id)}>
                  Cancel Order
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function SellerOrders() {
  const { sellerOrders, setOrderStatus } = useCart()
  const { firebaseUser } = useUser()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  async function changeStatus(orderId, status) {
    setBusy(orderId)
    setError('')
    try {
      await setOrderStatus(orderId, status)
    } catch (err) {
      setError(err.message || 'Could not update the order.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="store-wrap">
      <div className="market-head">
        <div>
          <p className="market-kicker">SELLER MODE</p>
          <h1>Customer Orders</h1>
          <p className="text-muted mb-0">Process orders for products sold by your shop.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger mt-4">{error}</div>}

      {sellerOrders.length === 0 ? (
        <div className="seller-empty mt-4">
          <i className="bi bi-bag-x"></i>
          <h2>No customer orders yet</h2>
          <p>When a customer buys one of your products, the order will appear here.</p>
        </div>
      ) : (
        <div className="order-stack mt-4">
          {sellerOrders.map((order) => {
            const items = order.items.filter((item) => item.sellerId === firebaseUser?.uid)
            const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

            return (
              <div className="order-card" key={order.id}>
                <div className="order-card-head">
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <div className="small text-muted">
                      {order.buyer?.name || order.userEmail} · {new Date(order.placedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[order.status] || 'bg-secondary'}`}>
                    {order.status}
                  </span>
                </div>

                <div className="order-customer-box">
                  <div><i className="bi bi-person me-2"></i>{order.buyer?.name || 'Customer'}</div>
                  <div><i className="bi bi-telephone me-2"></i>{order.buyer?.contactNumber || '—'}</div>
                  <div><i className="bi bi-geo-alt me-2"></i>{order.buyer?.address || '—'}</div>
                  <div><i className="bi bi-wallet2 me-2"></i>{order.paymentMethod}</div>
                </div>

                <div className="order-items">
                  {items.map((item) => (
                    <div className="order-item-row" key={item.id}>
                      <img src={item.img} alt={item.name} />
                      <div className="flex-grow-1">
                        <strong>{item.name}</strong>
                        <div className="small text-muted">Size {item.size} · x{item.qty}</div>
                      </div>
                      <strong>{money(item.price * item.qty)}</strong>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <span>Seller Total</span>
                  <strong>{money(total)}</strong>
                </div>

                <div className="seller-order-actions mt-3">
                  <select
                    className="form-select"
                    value={order.status}
                    disabled={busy === order.id}
                    onChange={(e) => changeStatus(order.id, e.target.value)}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <Link to="/notifications" className="btn btn-outline-dark text-decoration-none">
                    View Notifications
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

function Orders() {
  const { mode } = useUser()

  return (
    <div className="app active">
      <Nav />
      {mode === 'seller' ? <SellerOrders /> : <CustomerOrders />}
    </div>
  )
}

export default Orders
