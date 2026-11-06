import { useState } from 'react'
import { useProducts } from '../context/ProductsContext.jsx'

const INITIAL_FORM = {
  name: '',
  brand: 'NIKE',
  code: '',
  priceValue: '',
  stock: '1',
  sizes: '7, 8, 9, 10',
  image: '',
  description: '',
}

function AddProduct({ open, onClose }) {
  const { addProduct } = useProducts()
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function close() {
    if (saving) return
    setForm(INITIAL_FORM)
    setError('')
    setSubmitted(false)
    onClose()
  }

  function handleImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Pumili ng valid na image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Maximum image size ay 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => change('image', String(reader.result || ''))
    reader.onerror = () => setError('Hindi mabasa ang image.')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const sizes = form.sizes.split(',').map((size) => size.trim()).filter(Boolean)
    const priceValue = Number(form.priceValue)
    const stock = Number(form.stock)

    if (!form.name.trim() || !form.code.trim() || !Number.isFinite(priceValue) || priceValue <= 0) {
      setError('Ilagay ang product name, code, at valid na presyo.')
      return
    }
    if (!sizes.length || !Number.isInteger(stock) || stock < 0) {
      setError('Maglagay ng kahit isang shoe size at valid na stock.')
      return
    }

    try {
      setSaving(true)
      await addProduct({
        name: form.name.trim(),
        brand: form.brand,
        code: form.code.trim(),
        priceValue,
        stock,
        size: sizes,
        image: form.image || '/items/samba.avif',
        description: form.description.trim(),
      })
      setSubmitted(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err.message || 'Hindi maisumite ang product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', overflowY: 'auto' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg rounded-4">
          <div className="modal-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="mb-1">Submit a Shoe</h4>
                <p className="text-muted mb-0">Iche-check muna ng admin bago makita sa store.</p>
              </div>
              <button type="button" className="btn-close" onClick={close} disabled={saving} />
            </div>

            {submitted ? (
              <div className="alert alert-success mb-0">
                <strong>Na-submit na ang product!</strong>
                <div>Pending for admin approval ito. Makikita mo ang status sa Seller Dashboard.</div>
                <button type="button" className="btn btn-dark btn-sm mt-3" onClick={close}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Product image (optional)</label>
                    <input type="file" accept="image/*" className="form-control" onChange={handleImage} />
                    {form.image && <img src={form.image} alt="Product preview" className="mt-2 rounded" style={{ width: 100, height: 100, objectFit: 'cover' }} />}
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Product name *</label>
                    <input className="form-control" value={form.name} onChange={(e) => change('name', e.target.value)} required maxLength={120} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Brand</label>
                    <select className="form-select" value={form.brand} onChange={(e) => change('brand', e.target.value)}>
                      <option>NIKE</option><option>ADIDAS</option><option>PUMA</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label">Brand code *</label>
                    <input className="form-control" value={form.code} onChange={(e) => change('code', e.target.value)} required />
                  </div>
                  <div className="col-6 col-md-4">
                    <label className="form-label">Selling price (₱) *</label>
                    <input type="number" min="1" step="0.01" className="form-control" value={form.priceValue} onChange={(e) => change('priceValue', e.target.value)} required />
                  </div>
                  <div className="col-6 col-md-4">
                    <label className="form-label">Stock *</label>
                    <input type="number" min="0" step="1" className="form-control" value={form.stock} onChange={(e) => change('stock', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Sizes (comma separated)</label>
                    <input className="form-control" value={form.sizes} onChange={(e) => change('sizes', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description (optional)</label>
                    <textarea className="form-control" rows="2" value={form.description} onChange={(e) => change('description', e.target.value)} />
                  </div>
                </div>
                {error && <div className="alert alert-danger mt-3 py-2">{error}</div>}
                <div className="d-flex gap-2 mt-4">
                  <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Submitting...' : 'Submit for approval'}</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={close} disabled={saving}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddProduct
