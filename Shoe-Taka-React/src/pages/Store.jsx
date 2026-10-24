import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { money } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import Nav from '../components/Nav.jsx'

const brandOptions = ['ALL', 'NIKE', 'ADIDAS', 'PUMA']

function Store() {
  const { addToCart } = useCart()
  const { products: PRODUCTS, loading: productsLoading, error: productsError } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()

  
  const requestedBrand = (searchParams.get('brand') || 'ALL').toUpperCase()
  const initialBrand = brandOptions.includes(requestedBrand) ? requestedBrand : 'ALL'
  const [activeBrand, setActiveBrand] = useState(initialBrand)

  // Tracks which size is currently selected per product, so "Add to cart"
  // knows which size to attach. Defaults to each shoe's first available size.
  const [selectedSizes, setSelectedSizes] = useState(() =>
    Object.fromEntries(PRODUCTS.map((p) => [p.id, p.size[0]]))
  )

  
  useEffect(() => {
    if (activeBrand === 'ALL') {
      setSearchParams({})
    } else {
      setSearchParams({ brand: activeBrand })
    }
  }, [activeBrand, setSearchParams])

  
  const filtered =
    activeBrand === 'ALL'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.brand === activeBrand)

  return (
    <div className="app active">
      <Nav />

      <main className="store-wrap">
        <div className="store-head">
          <div>
            <p className="brand-code">SHOE TAKA MARKETPLACE</p>
            <h1>STEP UP YOUR STYLE</h1>
          </div>
          <p className="ulo-desc">SHOP. SELL. GROW.</p>
        </div>

        {/* Brand filter buttons */}
        <div className="brand-filters">
          {brandOptions.map((b) => (
            <button
              key={b}
              className={`brand-filter ${activeBrand === b ? 'active' : ''}`}
              onClick={() => setActiveBrand(b)}
            >
              {b === 'ALL' ? 'All' : b.charAt(0) + b.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Product list */}
        {productsLoading ? (
          <div className="empty-state">Loading products...</div>
        ) : productsError ? (
          <div className="empty-state">{productsError}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No products in this brand yet.</div>
        ) : (
          <div className="row g-4">
            {filtered.map((p) => (

              <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                <article className="product-card">
                  <img src={p.image} alt={p.name} />
                  <div className="product-body">
                    <div className="brand-code">
                      {p.brand} · BRAND CODE: {p.code}
                    </div>
                    
                    <h3 className="mt-2 mb-2">{p.name}</h3>
                  {}
                  <label className="product-size">
                   Size:
                  <select
                    value={selectedSizes[p.id] ?? p.size[0]}
                    onChange={(e) =>
                      setSelectedSizes((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                  >
                   {p.size.map((s) => (
                    <option key={s} value={s}>{s}</option>
                     ))}
                     </select>
                     </label>
                    <div className="small text-muted mb-3">
                      {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      {p.sellerId ? ' · Seller listed' : ''}
                    </div>
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <span className="product-price">{money(p.priceValue)}</span>
                      <button
                        className="btn-primary"
                        disabled={p.stock <= 0}
                        onClick={() => addToCart(p.id, selectedSizes[p.id] ?? p.size[0])}
                      >
                        {p.stock > 0 ? 'Add to cart' : 'Out of stock'}
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Store
