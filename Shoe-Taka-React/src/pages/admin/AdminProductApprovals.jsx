import { useState } from 'react'
import { money } from '../../data/products.js'
import { useProducts } from '../../context/ProductsContext.jsx'

function AdminProductApprovals() {
  const { products, reviewProduct } = useProducts()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const pending = products.filter((product) => product.status === 'pending')

  function handleReview(product, status) {
    let reason = ''
    if (status === 'rejected') {
      reason = window.prompt(`Reason for rejecting "${product.name}" (optional):`) || ''
    }
    setError('')
    setNotice('')
    setBusyId(product.id)
    try {
      reviewProduct(product.id, status, reason)
      setNotice(status === 'approved' ? `${product.name} approved.` : `${product.name} rejected.`)
    } catch (err) {
      setError(err.message || 'Could not update product status.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-kicker">ADMIN PANEL</div>
      <h1 className="admin-page-title">Product Approval</h1>
      <p className="text-muted">Review seller-submitted shoes before they appear in the public store.</p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {notice && <div className="alert alert-success py-2">{notice}</div>}
      <h2 className="admin-section-title">Pending submissions ({pending.length})</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Image</th><th>Product</th><th>Brand</th><th>Price</th><th>Stock</th><th>Seller ID</th><th>Action</th></tr>
          </thead>
          <tbody>
            {pending.map((product) => (
              <tr key={product.id}>
                <td><img src={product.image} alt={product.name} className="admin-thumb" /></td>
                <td><strong>{product.name}</strong><div className="small text-muted">{product.code} · Sizes: {product.size.join(', ')}</div></td>
                <td>{product.brand}</td>
                <td>{money(product.priceValue)}</td>
                <td>{product.stock}</td>
                <td className="small">{product.sellerId || '—'}</td>
                <td>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-success" disabled={busyId === product.id} onClick={() => handleReview(product, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-outline-danger" disabled={busyId === product.id} onClick={() => handleReview(product, 'rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {pending.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">Walang pending submissions. All caught up!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminProductApprovals
