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
    createdAtMs: Number(product.createdAtMs) || Date.now(),
    updatedAtMs: Number(product.updatedAtMs) || Date.now(),
  }
}

function readProducts() {
  // TEMPORARY LOCAL STORAGE:
  // Replace this with GET /api/products when Express is connected.
  const saved = readJSON(STORAGE_KEYS.products, null)
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.map((p) => normalizeProduct(p))
  }

  const seeded = SEED_PRODUCTS.map((p, index) =>
    normalizeProduct(p, p.id || `seed-${index}`)
  )
  writeJSON(STORAGE_KEYS.products, seeded)
  return seeded
}

export function ProductsProvider({ children }) {
  const { firebaseUser } = useUser()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setProducts(readProducts())
    setLoading(false)
  }, [])

  function saveProducts(nextProducts) {
    const normalized = nextProducts.map((p) => normalizeProduct(p))
    setProducts(normalized)

    // TEMPORARY LOCAL STORAGE:
    // Replace this with POST/PATCH/DELETE /api/products later.
    writeJSON(STORAGE_KEYS.products, normalized)
  }

  function addProduct(data) {
    const product = normalizeProduct(
      {
        ...data,
        sellerId: data.sellerId || firebaseUser?.uid || null,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      },
      createId('product')
    )
    saveProducts([...products, product])
    return product
  }

  function updateProduct(id, updates) {
    const existing = products.find((p) => p.id === id)
    if (!existing) throw new Error('Product not found.')

    const next = products.map((p) =>
      p.id === id
        ? normalizeProduct({
            ...p,
            ...updates,
            id,
            sellerId: updates.sellerId ?? p.sellerId,
            updatedAtMs: Date.now(),
          })
        : p
    )
    saveProducts(next)
  }

  function deleteProduct(id) {
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
      // TEMPORARY LOCAL STORAGE:
      // Replace this inventory update with the server-side stock transaction later.
      writeJSON(STORAGE_KEYS.products, next)
      return next
    })
  }

  function seedProducts() {
    const existingIds = new Set(products.map((p) => p.id))
    const missing = SEED_PRODUCTS.filter((p) => !existingIds.has(p.id))
      .map((p) => normalizeProduct(p))
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
