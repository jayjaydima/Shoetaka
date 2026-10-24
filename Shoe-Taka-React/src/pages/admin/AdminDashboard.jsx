import { useCart } from '../../context/CartContext.jsx'
import { useProducts } from '../../context/ProductsContext.jsx'
import { money } from '../../data/products.js'

function AdminDashboard() {
  const { allOrders: orders } = useCart()
  const { products } = useProducts()

  const totalOrders = orders.length
  // Cancelled orders don't count as sales
  const totalSales = orders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((sum, order) => sum + order.total, 0)
  const totalProducts = products.length

  return (
    <div className="admin-page">
      <div className="admin-page-kicker">ADMIN PANEL</div>
      <h1 className="admin-page-title">Dashboard</h1>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total Orders</span>
          <span className="admin-stat-value">{totalOrders}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total Sales</span>
          <span className="admin-stat-value">{money(totalSales)}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Products</span>
          <span className="admin-stat-value">{totalProducts}</span>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mt-4">
          <h2 className="admin-section-title">Recent Orders</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Buyer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber || order.id}</td>
                    <td>{order.buyer?.name || '—'}</td>
                    <td>{order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                    <td>{money(order.total)}</td>
                    <td>
                      <span className="admin-badge">{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
