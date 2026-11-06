import { createContext, useContext, useEffect, useState } from 'react'
import { PRODUCTS as SEED_PRODUCTS } from '../data/products.js'
import {
  STORAGE_KEYS,
  readJSON,
  writeJSON,
  createId,
} from '../data/storage.js'
import { useUser } from './UserContext.jsx'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const PRODUCT_API_URL = `${API_URL}/api/product`

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
    const localProducts = readProducts()
    setProducts(localProducts)
    setLoading(false)

    async function syncServerProducts() {
      try {
        const response = await fetch(PRODUCT_API_URL)
        if (!response.ok) throw new Error('Hindi makuha ang products mula sa server.')
        const serverItems = await response.json()
        if (!Array.isArray(serverItems) || !active) return

        const serverProducts = serverItems.map((item) => normalizeProduct({
          id: item.id,
          name: item.product,
          brand: item.brand || '',
          code: item.code || '',
          priceValue: Number(item.sell) || 0,
          stock: Number(item.stock) || 0,
          image: item.image || '/items/samba.avif',
          size: item.size || ['7', '8', '9', '10'],
          description: item.description || '',
          sellerId: item.sellerId || null,
          status: item.status || (item.sellerId ? 'pending' : 'approved'),
          rejectionReason: item.rejectionReason || '',
        }))
        const merged = [...localProducts]
        serverProducts.forEach((serverProduct) => {
          const index = merged.findIndex((item) => String(item.id) === String(serverProduct.id))
          if (index >= 0) merged[index] = serverProduct
          else merged.push(serverProduct)
        })
        if (active) {
          setProducts(merged)
          writeJSON(STORAGE_KEYS.products, merged)
          setError('')
        }
      } catch (err) {
        if (active) setError(err.message || 'Product server is unavailable.')
      }
    }

    syncServerProducts()
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

    const response = await fetch(PRODUCT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: product.name,
        buy: String(data.buy ?? '0'),
        sell: String(product.priceValue),
        stock: String(product.stock),
        image: product.image,
        brand: product.brand,
        code: product.code,
        size: product.size,
        description: product.description,
        sellerId: product.sellerId,
        status: product.status,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Hindi ma-save ang product sa server.')

    const savedProduct = normalizeProduct({
      ...product,
      ...result,
      id: result.id,
      name: result.product || product.name,
      priceValue: Number(result.sell ?? product.priceValue),
      stock: Number(result.stock ?? product.stock),
      image: result.image || product.image,
      brand: result.brand || product.brand,
      code: result.code || product.code,
      size: result.size || product.size,
    })
    saveProducts([...products, savedProduct])
    return savedProduct
  }

  async function updateProduct(id, updates) {
    const existing = products.find((p) => p.id === id)
    if (!existing) throw new Error('Product not found.')

    const safeUpdates = { ...updates }
    if (!isAdmin) {
      delete safeUpdates.status
      delete safeUpdates.sellerId
      safeUpdates.status = existing.sellerId ? 'pending' : existing.status
      safeUpdates.rejectionReason = ''
    }
    const updatedProduct = normalizeProduct({
      ...existing,
      ...safeUpdates,
      id,
      sellerId: isAdmin ? (updates.sellerId ?? existing.sellerId) : existing.sellerId,
      updatedAtMs: Date.now(),
    })

    if (Number.isFinite(Number(id))) {
      const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: updatedProduct.name,
          buy: String(updates.buy ?? existing.buy ?? '0'),
          sell: String(updatedProduct.priceValue),
          stock: String(updatedProduct.stock),
          image: updatedProduct.image,
          brand: updatedProduct.brand,
          code: updatedProduct.code,
          size: updatedProduct.size,
          description: updatedProduct.description,
          sellerId: updatedProduct.sellerId,
          status: updatedProduct.status,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Hindi ma-update ang product sa server.')
    }

    saveProducts(products.map((p) => p.id === id ? updatedProduct : p))
    return updatedProduct
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

  async function deleteProduct(id) {
    const product = products.find((p) => p.id === id)
    if (!isAdmin && product?.sellerId !== firebaseUser?.uid) {
      throw new Error('You can only delete your own products.')
    }

    if (Number.isFinite(Number(id))) {
      const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Hindi ma-delete ang product sa server.')
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
