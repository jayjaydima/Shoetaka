import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import Nav from '../components/Nav.jsx'
import { money } from '../data/products.js'

function CustomerProfile() {
  const { user, updateProfile } = useUser()
  const { orders, cartCount } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setPhone(user?.phone || '')
    setAddress(user?.address || '')
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Could not save profile:', err)
      setSaveError('Could not save your profile. Please try again.')
    }
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : '?'

  return (
    <main className="store-wrap">
      <div className="market-head">
        <div>
          <p className="market-kicker">CUSTOMER PROFILE</p>
          <h1>My Profile</h1>
        </div>
        <Link to="/dashboard" className="btn-ghost text-decoration-none">Dashboard</Link>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="profile-summary">
            <div className="profile-avatar-large">{initial}</div>
            <h2>{name || 'No name set'}</h2>
            <p>{user?.email}</p>
            <span className="profile-mode-tag">Customer</span>
            <hr />
            <div className="profile-stats">
              <div><strong>{orders.length}</strong><span>Orders</span></div>
              <div><strong>{cartCount}</strong><span>In Cart</span></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="profile-form-card">
            <div className="market-panel-head">
              <h2>Account Details</h2>
            </div>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
                </div>
                <div className="col-12">
                  <label className="form-label">Email Address</label>
                  <input className="form-control" type="email" value={user?.email || ''} disabled readOnly />
                </div>
                <div className="col-12">
                  <label className="form-label">Contact Number</label>
                  <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your contact number" />
                </div>
                <div className="col-12">
                  <label className="form-label">Delivery Address</label>
                  <textarea className="form-control" rows="3" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your default delivery address" />
                </div>
              </div>

              {saved && <div className="text-success small mt-3">Profile updated successfully.</div>}
              {saveError && <div className="text-danger small mt-3">{saveError}</div>}

              <button type="submit" className="btn-primary mt-3">Update Profile</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

function SellerProfile() {
  const { user, sellerProfile, updateSellerProfile } = useUser()
  const { sellerOrders } = useCart()
  const [form, setForm] = useState(sellerProfile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(sellerProfile)
  }, [sellerProfile])

  function change(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    updateSellerProfile({
      shopName: form.shopName.trim(),
      sellerName: form.sellerName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
      photoURL: form.photoURL.trim(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalSales = sellerOrders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((sum, order) => {
      return (
        sum +
        order.items
          .filter((item) => item.sellerId === user?.uid)
          .reduce((s, item) => s + item.price * item.qty, 0)
      )
    }, 0)

  const initial = (form.sellerName || user?.name || '?').trim().charAt(0).toUpperCase()

  return (
    <main className="store-wrap">
      <div className="market-head">
        <div>
          <p className="market-kicker">SELLER PROFILE</p>
          <h1>{form.shopName || 'My Shop'}</h1>
        </div>
        <Link to="/dashboard" className="btn-ghost text-decoration-none">Seller Dashboard</Link>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="profile-summary seller-summary">
            <div className="profile-avatar-large">{initial}</div>
            <h2>{form.shopName || 'Shop Name'}</h2>
            <p>{form.sellerName || user?.name || 'Seller name'}</p>
            <span className="profile-mode-tag seller">Active Seller</span>
            <hr />
            <div className="profile-stats">
              <div><strong>{sellerOrders.length}</strong><span>Orders</span></div>
              <div><strong>{money(totalSales)}</strong><span>Sales</span></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="profile-form-card">
            <div className="market-panel-head">
              <h2>Shop Details</h2>
            </div>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Shop Name</label>
                  <input className="form-control" value={form.shopName} onChange={(e) => change('shopName', e.target.value)} placeholder="e.g. Shoe Taka PH" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Seller Name</label>
                  <input className="form-control" value={form.sellerName} onChange={(e) => change('sellerName', e.target.value)} placeholder="Your name" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Email Address</label>
                  <input className="form-control" value={user?.email || ''} disabled readOnly />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Contact Number</label>
                  <input className="form-control" value={form.phone} onChange={(e) => change('phone', e.target.value)} placeholder="Contact number" />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Shop Address</label>
                  <input className="form-control" value={form.address} onChange={(e) => change('address', e.target.value)} placeholder="Shop address" />
                </div>
                <div className="col-12">
                  <label className="form-label">Shop Description</label>
                  <textarea className="form-control" rows="4" value={form.description} onChange={(e) => change('description', e.target.value)} placeholder="Tell customers about your shop" />
                </div>
              </div>

              {saved && <div className="text-success small mt-3">Seller profile updated.</div>}
              <button type="submit" className="btn-primary mt-3">Update Profile</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

function Profile() {
  const { mode } = useUser()

  return (
    <div className="app active">
      <Nav />
      {mode === 'seller' ? <SellerProfile /> : <CustomerProfile />}
    </div>
  )
}

export default Profile
