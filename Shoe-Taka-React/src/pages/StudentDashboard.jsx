import { Link } from 'react-router-dom'
import { useState } from 'react'
import { money } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import Nav from '../components/Nav.jsx'
import AddProduct from './AddProduct.jsx'

function CustomerDashboard() {
  const { cartCount, cartTotal, orders } = useCart()
  const { user } = useUser()
  const { products } = useProducts()

  const recentOrders = orders.slice(0, 4)

  return (
    <div className="app active">
      <Nav />
      <main className="store-wrap">
        <div className="market-head">
          <div>
            <p className="market-kicker">CUSTOMER DASHBOARD</p>
            <h1>Welcome back{user?.name ? `, ${user.name}` : ''}.</h1>
            <p className="text-muted mb-0">Shop your favorite shoes and keep track of your orders.</p>
          </div>
          <Link to="/store" className="btn-primary text-decoration-none">Shop Now</Link>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-bag-check"></i>
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Orders</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-cart3"></i>
              <div className="stat-value">{cartCount}</div>
              <div className="stat-label">In Cart</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-wallet2"></i>
              <div className="stat-value">{money(cartTotal)}</div>
              <div className="stat-label">Cart Value</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-box-seam"></i>
              <div className="stat-value">{products.length}</div>
              <div className="stat-label">Products</div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-3">
          <div className="col-12 col-lg-7">
            <section className="market-panel h-100">
              <div className="market-panel-head">
                <h2>Recent Orders</h2>
                <Link to="/orders">View All</Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="empty-state border-0 p-4">You have no orders yet.</div>
              ) : (
                <div className="market-list">
                  {recentOrders.map((order) => (
                    <div className="market-list-row" key={order.id}>
                      <div className="market-list-icon">
                        <i className="bi bi-box"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold">{order.items?.[0]?.name || 'Order'}</div>
                        <div className="small text-muted">
                          {order.items?.length > 1 ? `${order.items.length} products · ` : ''}
                          {new Date(order.placedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">{money(order.total)}</div>
                        <span className="market-status">{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="col-12 col-lg-5">
            <section className="market-panel h-100">
              <div className="market-panel-head">
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-action-grid">
                <Link to="/store" className="quick-action">
                  <i className="bi bi-shop"></i>
                  <span>Browse Store</span>
                </Link>
                <Link to="/cart" className="quick-action">
                  <i className="bi bi-cart"></i>
                  <span>View Cart</span>
                </Link>
                <Link to="/orders" className="quick-action">
                  <i className="bi bi-receipt"></i>
                  <span>My Orders</span>
                </Link>
                <Link to="/profile" className="quick-action">
                  <i className="bi bi-person"></i>
                  <span>Update Profile</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function SellerDashboard() {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const { firebaseUser, sellerProfile } = useUser()
  const { sellerOrders, unreadNotifications } = useCart()
  const { products } = useProducts()

  const sellerId = firebaseUser?.uid
  const sellerProducts = products.filter((product) => product.sellerId === sellerId)
  const activeOrders = sellerOrders.filter((order) => order.status !== 'Cancelled')
  const pendingOrders = sellerOrders.filter(
    (order) => order.status === 'New' || order.status === 'Processing'
  )
  const sales = activeOrders.reduce((sum, order) => {
    return (
      sum +
      order.items
        .filter((item) => item.sellerId === sellerId)
        .reduce((itemSum, item) => itemSum + item.price * item.qty, 0)
    )
  }, 0)

  return (
    <div className="app active">
      <Nav />
      <main className="store-wrap">
        <div className="market-head">
          <div>
            <p className="market-kicker">SELLER DASHBOARD</p>
            <h1>Welcome{sellerProfile.shopName ? `, ${sellerProfile.shopName}` : ', Seller'}.</h1>
            <p className="text-muted mb-0">Manage your products, orders, and shop.</p>
          </div>
         
        </div>

        {!sellerProfile.shopName && (
          <div className="seller-setup-banner mt-4">
            <div>
              <strong>Set up your seller profile.</strong>
              <span> Add your shop information so customers know who they are buying from.</span>
            </div>
            <Link to="/profile" className="btn btn-dark btn-sm">Update Profile</Link>
          </div>
        )}

        <div className="row g-3 mt-2">
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-box-seam"></i>
              <div className="stat-value">{sellerProducts.length}</div>
              <div className="stat-label">Products</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-bag-check"></i>
              <div className="stat-value">{sellerOrders.length}</div>
              <div className="stat-label">Orders</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-wallet2"></i>
              <div className="stat-value">{money(sales)}</div>
              <div className="stat-label">Sales</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="market-stat-card">
              <i className="bi bi-bell"></i>
              <div className="stat-value">{unreadNotifications}</div>
              <div className="stat-label">Notifications</div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-3">
          <div className="col-12 col-lg-8">
            <section className="market-panel h-100">
              <div className="market-panel-head">
                <h2>Recent Orders</h2>
                <Link to="/orders">View All</Link>
              </div>
              {sellerOrders.length === 0 ? (
                <div className="empty-state border-0 p-4">
                  No customer orders yet. Add a product and start selling.
                </div>
              ) : (
                <div className="market-list">
                  {sellerOrders.slice(0, 5).map((order) => {
                    const items = order.items.filter((item) => item.sellerId === sellerId)
                    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
                    return (
                      <div className="market-list-row" key={order.id}>
                        <div className="market-list-icon">
                          <i className="bi bi-person-check"></i>
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-bold">{items[0]?.name || 'Customer Order'}</div>
                          <div className="small text-muted">
                            {order.buyer?.name || order.userEmail} · {order.orderNumber}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold">{money(total)}</div>
                          <span className="market-status">{order.status}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="col-12 col-lg-4">
            <section className="market-panel h-100">
              <div className="market-panel-head">
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-action-grid seller">
                <button type="button" className="quick-action border-0 bg-transparent" onClick={() => setShowAddProduct(true)}>
                  <i className="bi bi-plus-square"></i>
                  <span>Add Product</span>
                </button>
                <Link to="/orders" className="quick-action">
                  <i className="bi bi-receipt"></i>
                  <span>View Orders</span>
                </Link>
                <Link to="/notifications" className="quick-action">
                  <i className="bi bi-bell"></i>
                  <span>Notifications</span>
                </Link>
              </div>
              <div className="seller-mini-stat">
                <span>Pending Orders</span>
                <strong>{pendingOrders.length}</strong>
              </div>
            </section>
          </div>
        </div>

        <AddProduct
          open={showAddProduct}
          onClose={() => setShowAddProduct(false)}
        />
      </main>
    </div>
  )
}

function StudentDashboard() {
  const { mode } = useUser()
  return mode === 'seller' ? <SellerDashboard /> : <CustomerDashboard />
}

export default StudentDashboard
