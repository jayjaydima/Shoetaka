import { useEffect, useState } from 'react'

const api_url = 'http://localhost:8080/api/product'

const EMPTY = {
  product: '',
  buy: '',
  sell: '',
  stock: '',
  image: ''
}

// Resize the picked image so it stays small, then return a data URL
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Could not read the image.'))
    reader.onload = () => {
      const img = new Image()

      img.onerror = () => reject(new Error('Invalid image file.'))
      img.onload = () => {
        const max = 600
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')

        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }

      img.src = reader.result
    }

    reader.readAsDataURL(file)
  })
}

function Thumb({ src, size = 48 }) {
  if (!src) {
    return (
      <div
        className="d-flex align-items-center justify-content-center bg-light text-muted rounded"
        style={{ width: size, height: size, fontSize: 11 }}
      >
        No image
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="rounded"
      style={{ width: size, height: size, objectFit: 'cover' }}
    />
  )
}

function AddProduct() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)

  const [showAdd, setShowAdd] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [editID, setEditID] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editBuy, setEditBuy] = useState('')
  const [editSell, setEditSell] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editImage, setEditImage] = useState('')

  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetch(api_url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        return response.json()
      })
      .then((data) => {
        setItems(data)
      })
      .catch((err) => {
        console.log('Fetch error:', err)
        setError('Could not load products.')
      })
  }, [])

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    function onKey(event) {
      if (event.key === 'Escape' && !saving) {
        closeEditModal()
      }
    }

    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isModalOpen, saving])

  function change(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  async function pickImage(event, setter) {
    const file = event.target.files[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    try {
      setError('')
      setter(await readImage(file))
    } catch (err) {
      setError(err.message)
    }
  }

  function openAddModal() {
    setForm(EMPTY)
    setError('')
    setSaved(false)
    setShowAdd(true)
  }

  function closeAddModal() {
    if (saving) {
      return
    }

    setShowAdd(false)
    setForm(EMPTY)
    setError('')
    setSaved(false)
  }

  async function formSubmit(event) {
    event.preventDefault()

    setError('')
    setSaved(false)

    if (!form.product.trim()) {
      setError('Please enter a product name.')
      return
    }

    if (!form.buy.trim()) {
      setError('Please enter the buy price.')
      return
    }

    if (!form.sell.trim()) {
      setError('Please enter the sell price.')
      return
    }

    if (!form.stock.trim()) {
      setError('Please enter the stock quantity.')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: form.product.trim(),
          buy: form.buy,
          sell: form.sell,
          stock: form.stock,
          image: form.image
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product')
      }

      setItems((oldItems) => [
        ...oldItems,
        data
      ])

      setForm(EMPTY)
      setSaved(true)

      setTimeout(() => {
        setSaved(false)
        setShowAdd(false)
      }, 500)
    } catch (error) {
      console.log('Add error:', error)
      setError(error.message || 'Could not add the product.')
    } finally {
      setSaving(false)
    }
  }

  function openEditModal(item) {
    setEditID(item.id)
    setEditProduct(item.product)
    setEditBuy(item.buy)
    setEditSell(item.sell)
    setEditStock(item.stock)
    setEditImage(item.image || '')

    setError('')
    setIsModalOpen(true)
  }

  function closeEditModal() {
    if (saving) {
      return
    }

    setIsModalOpen(false)

    setEditID('')
    setEditProduct('')
    setEditBuy('')
    setEditSell('')
    setEditStock('')
    setEditImage('')

    setError('')
  }

  async function formEdit(event) {
    event.preventDefault()

    setError('')

    if (!editProduct.trim()) {
      setError('Please enter a product name.')
      return
    }

    if (!String(editBuy).trim()) {
      setError('Please enter the buy price.')
      return
    }

    if (!String(editSell).trim()) {
      setError('Please enter the sell price.')
      return
    }

    if (!String(editStock).trim()) {
      setError('Please enter the stock quantity.')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`${api_url}/${editID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: editProduct.trim(),
          buy: editBuy,
          sell: editSell,
          stock: editStock,
          image: editImage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update product')
      }

      setItems((oldItems) => {
        return oldItems.map((item) => {
          if (Number(item.id) === Number(editID)) {
            return data
          }

          return item
        })
      })

      closeEditModal()
    } catch (error) {
      console.log('Update error:', error)
      setError(error.message || 'Could not update the product.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
  if (!deleteTarget) {
    return
  }

  try {
    setSaving(true)

    const response = await fetch(`${api_url}/${deleteTarget.id}`, {
      method: 'DELETE'
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to delete record'
      )
    }

    setItems((oldItems) => {
      return oldItems.filter(
        (item) => Number(item.id) !== Number(deleteTarget.id)
      )
    })
  } catch (error) {
    console.log('Delete error:', error)
    setError(error.message || 'Could not delete the product.')
  } finally {
    setSaving(false)
    setDeleteTarget(null)
  }
}

  return (
    
    <div className="container-fluid py-4">
            {deleteTarget && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            overflowY: 'auto'
          }}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setDeleteTarget(null)
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg rounded-4">
              <div className="modal-body p-4 text-center">
                <h4 className="mb-2">Delete Product</h4>

                <p className="text-muted mb-4">
                  Are you sure you want to delete{' '}
                  <b>{deleteTarget.product}</b>?
                </p>

                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? 'Deleting...' : 'Yes, Delete'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setDeleteTarget(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="d-flex justify-content-between align-items-start mb-5">
        <div>
          <div className="small text-uppercase fw-bold mb-2">
            Seller Mode
          </div>

          <h1 className="fw-bold mb-2">
            My Shoes
          </h1>

          <p className="text-muted mb-0">
            Manage the shoes listed by your shop.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-dark rounded-pill px-4 py-2"
          onClick={openAddModal}
        >
          <b>+ Add Shoe</b>
        </button>
      </div>

      {error && !showAdd && !isModalOpen && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Product</th>
              <th>Buy</th>
              <th>Sell</th>
              <th>Stock</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.id}</td>
                <td>
                  <Thumb src={item.image} />
                </td>
                <td>{item.product}</td>
                <td>{item.buy}</td>
                <td>{item.sell}</td>
                <td>{item.stock}</td>

                <td>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openEditModal(item)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setDeleteTarget(item)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="text-center text-muted py-4"
                >
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            overflowY: 'auto'
          }}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeAddModal()
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg rounded-4">
              <div className="modal-body p-4">
                <form onSubmit={formSubmit}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h4 className="mb-1">Add Shoe</h4>
                      <p className="text-muted mb-0">
                        Add a new shoe to your inventory.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeAddModal}
                      disabled={saving}
                    ></button>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">
                        Picture
                      </label>

                      <div className="d-flex align-items-center gap-3">
                        <Thumb src={form.image} size={96} />

                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-control"
                            onChange={(e) =>
                              pickImage(e, (img) => change('image', img))
                            }
                          />

                          {form.image && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger px-0"
                              onClick={() => change('image', '')}
                            >
                              Remove picture
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">
                        Product *
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={form.product}
                        onChange={(e) =>
                          change('product', e.target.value)
                        }
                        placeholder="e.g. A1 Jordan"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Buy Price *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={form.buy}
                        onChange={(e) =>
                          change('buy', e.target.value)
                        }
                        placeholder="1800"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Sell Price *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={form.sell}
                        onChange={(e) =>
                          change('sell', e.target.value)
                        }
                        placeholder="2500"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Stock *
                      </label>

                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.stock}
                        onChange={(e) =>
                          change('stock', e.target.value)
                        }
                        placeholder="10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="alert alert-danger mt-3 py-2">
                      {error}
                    </div>
                  )}

                  {saved && (
                    <div className="alert alert-success mt-3 py-2">
                      Shoe added successfully.
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={saving}
                    >
                      {saving ? 'Adding...' : 'Add Shoe'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeAddModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            overflowY: 'auto'
          }}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeEditModal()
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg rounded-4">
              <div className="modal-body p-4">
                <form onSubmit={formEdit}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h4 className="mb-1">Edit Shoe</h4>
                      <p className="text-muted mb-0">
                        Update the shoe information.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeEditModal}
                      disabled={saving}
                    ></button>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">
                        Picture
                      </label>

                      <div className="d-flex align-items-center gap-3">
                        <Thumb src={editImage} size={96} />

                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-control"
                            onChange={(e) => pickImage(e, setEditImage)}
                          />

                          {editImage && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger px-0"
                              onClick={() => setEditImage('')}
                            >
                              Remove picture
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">
                        Product *
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={editProduct}
                        onChange={(e) =>
                          setEditProduct(e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Buy Price *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={editBuy}
                        onChange={(e) =>
                          setEditBuy(e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Sell Price *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={editSell}
                        onChange={(e) =>
                          setEditSell(e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Stock *
                      </label>

                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editStock}
                        onChange={(e) =>
                          setEditStock(e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="alert alert-danger mt-3 py-2">
                      {error}
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={saving}
                    >
                      {saving ? 'Updating...' : 'Update Shoe'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeEditModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddProduct