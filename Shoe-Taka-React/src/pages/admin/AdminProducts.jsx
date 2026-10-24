import { useState } from 'react'
import { useProducts } from '../../context/ProductsContext.jsx'
import { money } from '../../data/products.js'

const emptyForm = {
  name: '',
  brand: 'NIKE',
  code: '',
  priceValue: '',
  image: '',
  sizeList: '7,8,9,10',
}

function AdminProducts() {
  const {
    products,
    loading,
    error: loadError,
    addProduct,
    updateProduct,
    deleteProduct,
    seedProducts,
  } = useProducts()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleEditClick(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      brand: product.brand,
      code: product.code,
      priceValue: String(product.priceValue),
      image: product.image,
      sizeList: product.size.join(','),
    })
    setError('')
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await deleteProduct(product.id)
      if (editingId === product.id) resetForm()
    } catch (err) {
      console.error('Could not delete product:', err)
      setError('Could not delete the product. Please try again.')
    }
  }

  async function handleSeed() {
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const added = await seedProducts()
      setNotice(
        added > 0
          ? `Added ${added} starter product${added === 1 ? '' : 's'}.`
          : 'All starter products are already in the store.'
      )
    } catch (err) {
      console.error('Could not add starter products:', err)
      setError('Could not add the starter products. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.priceValue) {
      setError('Please fill in at least the name and price.')
      return
    }
    const size = form.sizeList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      code: form.code.trim(),
      priceValue: Number(form.priceValue),
      image: form.image.trim() || '/items/samba.avif',
      size,
    }

    setNotice('')
    setSaving(true)
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
      } else {
        await addProduct(payload)
      }
      resetForm()
    } catch (err) {
      console.error('Could not save product:', err)
      setError('Could not save the product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-kicker">ADMIN PANEL</div>
      <h1 className="admin-page-title">Product Management</h1>

      <div className="admin-form-card mb-4">
        <h2 className="admin-section-title">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Air Jordan (AJ1)"
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Brand</label>
              <select
                className="form-select"
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
              >
                <option value="NIKE">NIKE</option>
                <option value="ADIDAS">ADIDAS</option>
                <option value="PUMA">PUMA</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Code</label>
              <input
                type="text"
                className="form-control"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="e.g. NKE"
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Price (₱)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.priceValue}
                onChange={(e) => handleChange('priceValue', e.target.value)}
                placeholder="e.g. 3499"
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Sizes (comma separated)</label>
              <input
                type="text"
                className="form-control"
                value={form.sizeList}
                onChange={(e) => handleChange('sizeList', e.target.value)}
                placeholder="7,8,9,10"
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Image path</label>
              <input
                type="text"
                className="form-control"
                value={form.image}
                onChange={(e) => handleChange('image', e.target.value)}
                placeholder="/items/samba.avif"
              />
            </div>
          </div>

          {error && <div className="text-danger small mt-3">{error}</div>}

          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn shoe-btn-yellow px-4" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline-dark" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {loadError && <div className="alert alert-danger py-2">{loadError}</div>}
      {notice && <div className="alert alert-success py-2">{notice}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="admin-section-title mb-0">All Products ({products.length})</h2>
        <button
          type="button"
          className="btn btn-sm btn-outline-dark"
          onClick={handleSeed}
          disabled={saving}
          title="Adds the default Nike / Adidas / Puma shoes that are missing from Firestore"
        >
          Add starter products
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Sizes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <img src={p.image} alt={p.name} className="admin-thumb" />
                </td>
                <td>{p.name}</td>
                <td>{p.brand}</td>
                <td>{money(p.priceValue)}</td>
                <td>{p.size.join(', ')}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-dark me-2"
                    onClick={() => handleEditClick(p)}
                  >
                    <i className="bi bi-pencil-square"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(p)}
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  {loading
                    ? 'Loading products...'
                    : 'No products yet. Add one above, or click "Add starter products".'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminProducts
