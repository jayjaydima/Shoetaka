import { useState } from 'react'
import { useCart, ORDER_STATUSES } from '../../context/CartContext.jsx'
import { money } from '../../data/products.js'

function AdminOrders() {
  const { allOrders: orders, ordersError, setOrderStatus, deleteOrder } = useCart()
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function handleStatusChange(orderId, status) {
    setError('')
    setBusyId(orderId)
    try {
      await setOrderStatus(orderId, status)
    } catch (err) {
      console.error('Could not update order status:', err)
      setError('Could not update the order status. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(orderId) {
    if (!window.confirm('Permanently delete this order?')) return
    setError('')
    setBusyId(orderId)
    try {
      await deleteOrder(orderId)
    } catch (err) {
      console.error('Could not delete order:', err)
      setError('Could not delete the order. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-kicker">ADMIN PANEL</div>
      <h1 className="admin-page-title">Order Management</h1>

      {(error || ordersError) && (
        <div className="alert alert-danger py-2">{error || ordersError}</div>
      )}

      {orders.length === 0 ? (
        <div className="admin-empty">No orders have been placed yet.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map((order) => (
            <div className="admin-order-card" key={order.id}>
              <div className="admin-order-head">
                <div>
                  <div className="fw-bold">{order.orderNumber || order.id}</div>
                  <div className="text-muted small">
                    {new Date(order.placedAt).toLocaleString()}
                  </div>
                </div>
                <select
                  className="form-select form-select-sm admin-status-select"
                  value={order.status}
                  disabled={busyId === order.id}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="admin-order-body">
                {order.items.map((item) => (
                  <div key={item.id} className="admin-order-item">
                    <img src={item.img} alt={item.name} />
                    <div className="flex-grow-1">
                      <div className="fw-semibold small">{item.name}</div>
                      <div className="text-muted small">
                        {item.size ? `Size ${item.size} · ` : ''}x{item.qty}
                      </div>
                    </div>
                    <div className="fw-semibold small">{money(item.price * item.qty)}</div>
                  </div>
                ))}

                <div className="d-flex justify-content-between fw-bold mt-2 pt-2 border-top">
                  <span>Order Total</span>
                  <span>{money(order.total)}</span>
                </div>

                <div className="mt-2 pt-2 border-top small text-secondary">
                  <div><i className="bi bi-person-fill me-2"></i>{order.buyer?.name}</div>
                  {order.userEmail && (
                    <div><i className="bi bi-envelope-fill me-2"></i>{order.userEmail}</div>
                  )}
                  <div><i className="bi bi-geo-alt-fill me-2"></i>{order.buyer?.address}</div>
                  <div><i className="bi bi-telephone-fill me-2"></i>{order.buyer?.contactNumber}</div>
                  <div><i className="bi bi-wallet2 me-2"></i>{order.paymentMethod}</div>
                </div>

                <button
                  className="btn btn-outline-danger btn-sm mt-2"
                  disabled={busyId === order.id}
                  onClick={() => handleDelete(order.id)}
                >
                  Delete Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminOrders
