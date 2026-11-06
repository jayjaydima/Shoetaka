import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { money } from '../data/products.js'
import { useCart, parseCartKey } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import Nav from '../components/Nav.jsx'

function Cart() {
  const { cart, changeQuantity, removeFromCart, cartTotal, placeOrder } = useCart()
  const { user } = useUser()
  const { products: PRODUCTS } = useProducts()
  const navigate = useNavigate()
  const entries = Object.entries(cart)
  const itemCount = entries.reduce((sum, [, qty]) => sum + qty, 0)

  const [buyerName, setBuyerName] = useState(user?.name || '')
  const [buyerAddress, setBuyerAddress] = useState(user?.address || '')
  const [buyerContact, setBuyerContact] = useState(user?.phone || '')
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [checkoutError, setCheckoutError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)

  async function handleCheckout() {
    if (!buyerName.trim() || !buyerAddress.trim() || !buyerContact.trim()) {
      setCheckoutError('Please fill in your name, address, and contact number before checking out.')
      return
    }
    setCheckoutError('')
    setPlacing(true)
    try {
      await placeOrder(
        {
          name: buyerName.trim(),
          address: buyerAddress.trim(),
          contactNumber: buyerContact.trim(),
        },
        paymentMethod
      )
      setCheckoutModalOpen(false)
      navigate('/orders')
    } catch (err) {
      console.error('Checkout failed:', err)
      setCheckoutError('Could not place your order. Please try again.')
      setPlacing(false)
    }
  }

  return (
    <div className="app active">
      <Nav />
      <main className="store-wrap cart-page-wrap">
        <header className="cart-page-heading">
          <div>
            <p className="brand-code">SHOE TAKA MARKETPLACE</p>
            <h1>Your Shopping Cart</h1>
            <p>Review your pairs and delivery details before checkout.</p>
          </div>
          <button className="cart-continue-btn" type="button" onClick={() => navigate('/store')}>
            ← Continue shopping
          </button>
        </header>

        {entries.length === 0 ? (
          <section className="cart-empty-panel">
            <div className="cart-empty-icon">🛍️</div>
            <h2>Your cart is waiting for a fresh pair.</h2>
            <p>Browse the store and add your favorite shoes here.</p>
            <button className="btn-primary" type="button" onClick={() => navigate('/store')}>Explore the store</button>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-items-column">
              <div className="cart-section-heading">
                <div>
                  <h2>Cart items</h2>
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'items'} selected</span>
                </div>
                <span className="cart-secure-note">Ready for checkout</span>
              </div>

              <div className="cart-items-list">
                {entries.map(([cartKey, qty]) => {
                  const { productId, size } = parseCartKey(cartKey)
                  const p = PRODUCTS.find((prod) => prod.id === productId)
                  if (!p) return null
                  return (
                    <article className="cart-product-item" key={cartKey}>
                      <div className="cart-product-image">
                        <img src={p.image} alt={p.name} />
                      </div>
                      <div className="cart-product-info">
                        <span className="cart-product-brand">{p.brand}</span>
                        <h3>{p.name}</h3>
                        <span className="cart-product-size">Shoe size: <strong>{size}</strong></span>
                        <strong className="cart-product-unit-price">{money(p.priceValue)} <small>/ pair</small></strong>
                      </div>
                      <div className="cart-product-actions">
                        <div className="cart-quantity-control" aria-label={`Quantity for ${p.name}`}>
                          <button type="button" aria-label="Decrease quantity" onClick={() => changeQuantity(cartKey, -1)} disabled={qty <= 1}>−</button>
                          <span>{qty}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => changeQuantity(cartKey, 1)} disabled={qty >= p.stock}>+</button>
                        </div>
                        <strong className="cart-line-total">{money(p.priceValue * qty)}</strong>
                        <button className="cart-remove-btn" type="button" onClick={() => removeFromCart(cartKey)}>Remove item</button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <aside className="cart-checkout-column">
              <section className="cart-summary-card">
                <div className="cart-summary-heading">
                  <h2>Order summary</h2>
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="cart-summary-line">
                  <span>Subtotal</span>
                  <strong>{money(cartTotal)}</strong>
                </div>
                <div className="cart-summary-line">
                  <span>Shipping</span>
                  <span className="cart-shipping-note">Calculated after order</span>
                </div>
                <div className="cart-summary-total">
                  <span>Estimated total</span>
                  <strong>{money(cartTotal)}</strong>
                </div>
                <p className="cart-summary-caption">Shipping fees, if applicable, will be confirmed with your order.</p>
              </section>

              <section className="cart-checkout-card cart-checkout-launcher">
                <div className="cart-checkout-title">
                  <span>✓</span>
                  <div><h2>Ready to checkout?</h2><p>Review your items and complete your delivery details in the checkout window.</p></div>
                </div>
                <button className="btn-primary cart-checkout-button" type="button" onClick={() => { setCheckoutError(''); setCheckoutModalOpen(true) }}>
                  Place order · {money(cartTotal)}
                </button>
                <p className="cart-checkout-footnote">Your order details and final confirmation will appear in the checkout modal.</p>
              </section>
            </aside>
          </div>
        )}
      </main>
        {checkoutModalOpen && (
          <div className="checkout-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !placing) setCheckoutModalOpen(false) }}>
            <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
              <button className="checkout-modal-close" type="button" aria-label="Close checkout" onClick={() => setCheckoutModalOpen(false)} disabled={placing}>×</button>
              <div className="checkout-modal-heading">
                <p className="brand-code">SHOE TAKA CHECKOUT</p>
                <h2 id="checkout-modal-title">Confirm your order</h2>
                <p>Review the shoes you are ordering and confirm your delivery information.</p>
              </div>
              <div className="checkout-modal-items">
                <h3>Items to order <span>{itemCount}</span></h3>
                {entries.map(([cartKey, qty]) => {
                  const { productId, size } = parseCartKey(cartKey)
                  const p = PRODUCTS.find((prod) => prod.id === productId)
                  if (!p) return null
                  return (
                    <article className="checkout-modal-item" key={cartKey}>
                      <img src={p.image} alt={p.name} />
                      <div className="checkout-modal-item-info">
                        <strong>{p.name}</strong>
                        <span>Size {size} · Qty {qty}</span>
                      </div>
                      <strong className="checkout-modal-item-price">{money(p.priceValue * qty)}</strong>
                    </article>
                  )
                })}
                <div className="checkout-modal-total"><span>Order total</span><strong>{money(cartTotal)}</strong></div>
              </div>
              <div className="checkout-modal-form">
                <div className="cart-checkout-title"><span>01</span><div><h3>Delivery details</h3><p>Where should we send your shoes?</p></div></div>
                <div className="cart-form-field">
                  <label htmlFor="cart-buyer-name">Full name</label>
                  <input id="cart-buyer-name" type="text" placeholder="Enter your full name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                </div>
                <div className="cart-form-field">
                  <label htmlFor="cart-buyer-address">Delivery address</label>
                  <textarea id="cart-buyer-address" rows="2" placeholder="House number, street, barangay, city" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
                </div>
                <div className="cart-form-field">
                  <label htmlFor="cart-buyer-contact">Contact number</label>
                  <input id="cart-buyer-contact" type="tel" placeholder="09XX XXX XXXX" value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} />
                </div>
                <div className="cart-checkout-title cart-payment-title"><span>02</span><div><h3>Payment method</h3><p>Choose how you want to pay.</p></div></div>
                <div className="cart-payment-options">
                  {['GCash', 'Maya', 'COD'].map((method) => (
                    <label key={method} className={`cart-payment-option ${paymentMethod === method ? 'selected' : ''}`}>
                      <input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} />
                      <span>{method === 'COD' ? 'Cash on Delivery' : method}</span>
                    </label>
                  ))}
                </div>
                {checkoutError && <div className="cart-checkout-error" role="alert">{checkoutError}</div>}
              </div>
              <div className="checkout-modal-actions">
                <button className="cart-continue-btn" type="button" onClick={() => setCheckoutModalOpen(false)} disabled={placing}>Back to cart</button>
                <button className="btn-primary cart-checkout-button" type="button" onClick={handleCheckout} disabled={placing}>
                  {placing ? 'Placing order...' : 'Confirm place order · ' + money(cartTotal)}
                </button>
              </div>
            </section>
          </div>
        )}
    </div>
  )
}

export default Cart
