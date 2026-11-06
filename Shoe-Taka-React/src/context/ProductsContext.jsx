import { createContext, useContext, useEffect, useState } from 'react'
import { PRODUCTS as SEED_PRODUCTS } from '../data/products.js'
import {
  STORAGE_KEYS,
  readJSON,
  writeJSON,
  createId,
} from '../data/storage.js'
import { useUser } from './UserContext.jsx'

const ProductsContext = createContext(null)

function normalizeProduct(product, fallbackId) {
  return {
    id: product.id || fallbackId || createId('product'),
    name: String(product.name || '').trim(),
    brand: String(product.brand || '').trim().toUpperCase(),
    code: String(product.code || '').trim().toUpperCase(),
    priceValue: Number(product.priceValue) || 0,
    image: String(product.image || '/items/samba.avif').trim(),
    size: Array.isArray(product.size)
      ? product.size.map(String).filter(Boolean)
      : ['7', '8', '9', '10'],
    description: String(product.description || '').trim(),
    condition: String(product.condition || 'New').trim(),
    stock: Math.max(0, Number(product.stock) || 10),
    sellerId: product.sellerId || null,
    status: ['pending', 'approved', 'rejected'].includes(product.status)
      ? product.status
      : product.sellerId ? 'pending' : 'approved',
    rejectionReason: String(product.rejectionReason || ''),
    createdAtMs: Number(product.createdAtMs) || Date.now(),
    updatedAtMs: Number(product.updatedAtMs) || Date.now(),
  }
}

function readProducts() {
  const saved = readJSON(STORAGE_KEYS.products, null)
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.map((p) => normalizeProduct(p))
  }

  const seeded = SEED_PRODUCTS.map((p, index) =>
    normalizeProduct({ ...p, status: 'approved' }, p.id || `seed-${index}`)
  )
  writeJSON(STORAGE_KEYS.products, seeded)
  return seeded
}

export function ProductsProvider({ children }) {
  const { firebaseUser, isAdmin } = useUser()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProducts() {
      const localProducts = readProducts()
      if (active) {
        setProducts(localProducts)
        setLoading(false)
      }

      try {
        const response = await fetch('/api/product')
        if (!response.ok) throw new Error('Could not load products from server.')
        const serverProducts = await response.json()
        if (!Array.isArray(serverProducts) || !active) return

        // Keep seeded/local products and merge server records by ID.
        const merged = [...localProducts]
        const knownIds = new Set(merged.map((product) => String(product.id)))
        serverProducts.forEach((item) => {
          if (!knownIds.has(String(item.id))) merged.push(normalizeProduct(item))
        })
        if (active) {
          setProducts(merged)
          writeJSON(STORAGE_KEYS.products, merged)
          setError('')
        }
      } catch (err) {
        // The local catalog remains available while the API is offline.
        if (active) setError(err.message || 'Product server is unavailable.')
      }
    }

    loadProducts()
    return () => { active = false }
  }, [])

  function saveProducts(nextProducts) {
    const normalized = nextProducts.map((p) => normalizeProduct(p))
    setProducts(normalized)
    writeJSON(STORAGE_KEYS.products, normalized)
  }

  async function addProduct(data) {
    const sellerId = data.sellerId || (isAdmin ? null : firebaseUser?.uid || null)
    const product = normalizeProduct(
      {
        ...data,
        sellerId,
        status: isAdmin || !sellerId ? 'approved' : 'pending',
        rejectionReason: '',
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      },
      createId('product')
    )
    // Send the seller submission to Express before updating the local UI.
    const response = await fetch('/api/product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.message || 'Hindi ma-save ang product sa server.')
    }

    const savedProduct = normalizeProduct(result, product.id)
    saveProducts([...products, savedProduct])
    return savedProduct
  }

  function updateProduct(id, updates) {
    const existing = products.find((p) => p.id === id)
    if (!existing) throw new Error('Product not found.')

    const next = products.map((p) => {
      if (p.id !== id) return p
      const safeUpdates = { ...updates }
      if (!isAdmin) {
        delete safeUpdates.status
        delete safeUpdates.sellerId
        safeUpdates.status = p.sellerId ? 'pending' : p.status
        safeUpdates.rejectionReason = ''
      }
      return normalizeProduct({
        ...p,
        ...safeUpdates,
        id,
        sellerId: isAdmin ? (updates.sellerId ?? p.sellerId) : p.sellerId,
        updatedAtMs: Date.now(),
      })
    })
    saveProducts(next)
  }

  function reviewProduct(id, status, rejectionReason = '') {
    if (!isAdmin) throw new Error('Only admins can review products.')
    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid product review status.')
    }
    const existing = products.find((p) => p.id === id)
    if (!existing) throw new Error('Product not found.')
    saveProducts(products.map((p) =>
      p.id === id
        ? normalizeProduct({
            ...p,
            status,
            rejectionReason: status === 'rejected' ? rejectionReason.trim() : '',
            updatedAtMs: Date.now(),
          })
        : p
    ))
  }

  function deleteProduct(id) {
    const product = products.find((p) => p.id === id)
    if (!isAdmin && product?.sellerId !== firebaseUser?.uid) {
      throw new Error('You can only delete your own products.')
    }
    saveProducts(products.filter((p) => p.id !== id))
  }

  function adjustStock(id, delta) {
    setProducts((prev) => {
      const next = prev.map((product) =>
        product.id === id
          ? {
              ...product,
              stock: Math.max(0, product.stock + Number(delta)),
              updatedAtMs: Date.now(),
            }
          : product
      )
      writeJSON(STORAGE_KEYS.products, next)
      return next
    })
  }

  function seedProducts() {
    const existingIds = new Set(products.map((p) => p.id))
    const missing = SEED_PRODUCTS.filter((p) => !existingIds.has(p.id))
      .map((p) => normalizeProduct({ ...p, status: 'approved' }))
    if (missing.length === 0) return 0
    saveProducts([...products, ...missing])
    return missing.length
  }

  const value = {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    seedProducts,
    reviewProduct,
  }

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  return useContext(ProductsContext)
}
