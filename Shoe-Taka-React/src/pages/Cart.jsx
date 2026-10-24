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

  // Pre-fill delivery details from the saved profile (see Profile.jsx) so
  // returning users don't have to retype them every checkout.
  const [buyerName, setBuyerName] = useState(user?.name || '')
  const [buyerAddress, setBuyerAddress] = useState(user?.address || '')
  const [buyerContact, setBuyerContact] = useState(user?.phone || '')
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [checkoutError, setCheckoutError] = useState('')
  const [placing, setPlacing] = useState(false)

  async function handleCheckout() {
    if (!buyerName.trim() || !buyerAddress.trim() || !buyerContact.trim()) {
      setCheckoutError('Please fill in your name, address, and contact number before checking out.')
      return
    }
    setCheckoutError('')
    setPlacing(true)
    try {
      // Saves the order to Firestore
      await placeOrder(
        {
          name: buyerName.trim(),
          address: buyerAddress.trim(),
          contactNumber: buyerContact.trim(),
        },
        paymentMethod
      )
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

      <main className="store-wrap">
        <div className="store-head">
          <h1>Your Cart</h1>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">Your cart is empty. Go add some shoes!</div>
        ) : (
          <>
            {entries.map(([cartKey, qty]) => {
              const { productId, size } = parseCartKey(cartKey)
              const p = PRODUCTS.find((prod) => prod.id === productId)
              if (!p) return null
              return (
                <div className="cart-row" key={cartKey}>
                  <img src={p.image} alt={p.name} />
                  <div className="flex-grow-1">
                    <div className="fw-bold">{p.name}</div>
                    <div className="brand-code">{p.brand} · Size {size} · {money(p.priceValue)} each</div>
                    <div className="d-flex align-items-center gap-2 mt-2">
                      <button className="qty-btn" onClick={() => changeQuantity(cartKey, -1)}>−</button>
                      <span>{qty}</span>
                      <button className="qty-btn" onClick={() => changeQuantity(cartKey, 1)}>+</button>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">{money(p.priceValue * qty)}</div>
                    <button className="btn btn-link btn-sm text-danger p-0 mt-1" onClick={() => removeFromCart(cartKey)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
              <span className="fs-5 fw-bold">Total</span>
              <span className="fs-5 fw-bold">{money(cartTotal)}</span>
            </div>

            <div className="mt-4 pt-3 border-top">
              <h2 className="section-title h6 mb-3">Delivery Details</h2>
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Full name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Delivery address"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contact number"
                  value={buyerContact}
                  onChange={(e) => setBuyerContact(e.target.value)}
                />
              </div>
              {checkoutError && <div className="text-danger small mb-2">{checkoutError}</div>}
            </div>

            <div className="mt-3 pt-3 border-top">
              <h2 className="section-title h6 mb-3">Mode of Payment</h2>
              <div className="d-flex gap-4 flex-wrap">
                {['GCash', 'Maya', 'COD'].map((method) => (
                  <label key={method} className="d-flex align-items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            <button
              className="btn-primary w-100 mt-3"
              onClick={handleCheckout}
              disabled={placing}
            >
              {placing ? 'Placing order...' : 'Checkout'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}

export default Cart
