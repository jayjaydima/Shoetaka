import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { money } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import Nav from '../components/Nav.jsx'

const brandOptions = ['ALL', 'NIKE', 'ADIDAS', 'PUMA']

function Store() {
  const { addToCart, cart } = useCart()
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedBrand = (searchParams.get('brand') || 'ALL').toUpperCase()
  const initialBrand = brandOptions.includes(requestedBrand) ? requestedBrand : 'ALL'
  const [activeBrand, setActiveBrand] = useState(initialBrand)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalSize, setModalSize] = useState('')
  const [modalQuantity, setModalQuantity] = useState(1)
  const [cartMessage, setCartMessage] = useState('')
  const approvedProducts = products.filter((product) => product.status === 'approved')

  useEffect(() => {
    if (activeBrand === 'ALL') setSearchParams({})
    else setSearchParams({ brand: activeBrand })
  }, [activeBrand, setSearchParams])

  const filtered = activeBrand === 'ALL'
    ? approvedProducts
    : approvedProducts.filter((p) => p.brand === activeBrand)

  function openAddToCart(product) {
    if (product.stock <= 0) return
    setSelectedProduct(product)
    setModalSize(product.size?.[0] || '')
    setModalQuantity(1)
    setCartMessage('')
  }

  const cartKey = selectedProduct && modalSize
    ? `${selectedProduct.id}::${modalSize}`
    : ''
  const alreadyInCart = cartKey ? (cart[cartKey] || 0) : 0
  const availableQuantity = selectedProduct
    ? Math.max(0, selectedProduct.stock - alreadyInCart)
    : 0

  function confirmAddToCart() {
    if (!selectedProduct || !modalSize || modalQuantity < 1 || modalQuantity > availableQuantity) return
    addToCart(selectedProduct.id, modalSize, modalQuantity)
    setSelectedProduct(null)
  }

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

        {productsLoading ? (
          <div className="empty-state">Loading products...</div>
        ) : productsError ? (
          <div className="empty-state">{productsError}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No approved products in this brand yet.</div>
        ) : (
          <div className="row g-4">
            {filtered.map((p) => (
              <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                <article className="product-card">
                  <img src={p.image} alt={p.name} />
                  <div className="product-body">
                    <div className="brand-code">{p.brand} · BRAND CODE: {p.code}</div>
                    <h3 className="mt-2 mb-2">{p.name}</h3>
                    <div className="small text-muted mb-3">
                      {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      {p.sellerId ? ' · Seller listed' : ''}
                    </div>
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <span className="product-price">{money(p.priceValue)}</span>
                      <button
                        className="btn-primary"
                        disabled={p.stock <= 0}
                        onClick={() => openAddToCart(p)}
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

      {selectedProduct && (
        <div className="cart-picker-backdrop" onClick={() => setSelectedProduct(null)}>
          <section
            className="cart-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="cart-picker-close" type="button" aria-label="Close" onClick={() => setSelectedProduct(null)}>×</button>
            <div className="cart-picker-product">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
              <div>
                <p className="brand-code">{selectedProduct.brand}</p>
                <h2 id="cart-picker-title">{selectedProduct.name}</h2>
                <strong>{money(selectedProduct.priceValue)}</strong>
              </div>
            </div>

            <label className="cart-picker-label" htmlFor="cart-picker-size">Choose shoe size</label>
            <select
              id="cart-picker-size"
              className="cart-picker-select"
              value={modalSize}
              onChange={(event) => {
                setModalSize(event.target.value)
                setModalQuantity(1)
              }}
            >
              {(selectedProduct.size || []).map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            <label className="cart-picker-label" htmlFor="cart-picker-quantity">Quantity</label>
            <div className="cart-picker-quantity">
              <button type="button" aria-label="Decrease quantity" onClick={() => setModalQuantity((qty) => Math.max(1, qty - 1))} disabled={modalQuantity <= 1}>−</button>
              <input
                id="cart-picker-quantity"
                type="number"
                min="1"
                max={availableQuantity}
                value={modalQuantity}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setModalQuantity(Math.min(availableQuantity, Math.max(1, value || 1)))
                }}
              />
              <button type="button" aria-label="Increase quantity" onClick={() => setModalQuantity((qty) => Math.min(availableQuantity, qty + 1))} disabled={modalQuantity >= availableQuantity}>+</button>
            </div>
            <p className="cart-picker-stock">{availableQuantity} available for this size</p>
            <div className="cart-picker-total">
              <span>Subtotal</span>
              <strong>{money(selectedProduct.priceValue * modalQuantity)}</strong>
            </div>
            <button
              className="btn-primary cart-picker-submit"
              type="button"
              onClick={confirmAddToCart}
              disabled={!modalSize || availableQuantity < 1 || modalQuantity > availableQuantity}
            >
              Add {modalQuantity} to cart
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default Store
