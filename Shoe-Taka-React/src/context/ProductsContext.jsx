import { createContext, useContext, useEffect, useState } from 'react'
import { createId, STORAGE_KEYS, writeJSON } from '../data/storage.js'
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
    stock: Math.max(0, Number(product.stock) || 0),
    sellerId: product.sellerId || null,
    status: ['pending', 'approved', 'rejected'].includes(product.status)
      ? product.status
      : product.sellerId ? 'pending' : 'approved',
    rejectionReason: String(product.rejectionReason || ''),
    createdAtMs: Number(product.createdAtMs) || Date.now(),
    updatedAtMs: Number(product.updatedAtMs) || Date.now(),
  }
}

function mapServerProduct(item) {
  return normalizeProduct({
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
  })
}

export function ProductsProvider({ children }) {
  const { firebaseUser, isAdmin } = useUser()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadServerProducts() {
      setLoading(true)
      try {
        const response = await fetch(PRODUCT_API_URL)
        if (!response.ok) throw new Error('Hindi makuha ang products mula sa MySQL server.')
        const serverItems = await response.json()
        if (!Array.isArray(serverItems)) throw new Error('Invalid ang products response mula sa server.')

        if (active) {
          setProducts(serverItems.map(mapServerProduct))
          setError('')
        }
      } catch (err) {
        if (active) {
          setProducts([])
          setError(err.message || 'Hindi ma-connect ang MySQL product server.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadServerProducts()
    return () => { active = false }
  }, [])

  function saveProducts(nextProducts) {
    const normalized = nextProducts.map((p) => normalizeProduct(p))
    setProducts(normalized)
    // This is only a convenience cache; product loading always comes from MySQL.
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
        name: product.name,
        productName: product.name,
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
    if (!response.ok) throw new Error(result.message || 'Hindi ma-save ang product sa MySQL.')

    const savedProduct = mapServerProduct(result)
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

    const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: updatedProduct.name,
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
    if (!response.ok) throw new Error(result.message || 'Hindi ma-update ang product sa MySQL.')

    saveProducts(products.map((p) => String(p.id) === String(id) ? updatedProduct : p))
    return updatedProduct
  }

  async function reviewProduct(id, status, rejectionReason = '') {
    if (!isAdmin) throw new Error('Only admins can review products.')
    if (!['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid product review status.')
    }
    const existing = products.find((p) => String(p.id) === String(id))
    if (!existing) throw new Error('Product not found.')

    const updatedProduct = await updateProduct(id, {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason.trim() : '',
    })
    return updatedProduct
  }

  async function deleteProduct(id) {
    const product = products.find((p) => String(p.id) === String(id))
    if (!isAdmin && product?.sellerId !== firebaseUser?.uid) {
      throw new Error('You can only delete your own products.')
    }

    const response = await fetch(`${PRODUCT_API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Hindi ma-delete ang product sa MySQL.')

    saveProducts(products.filter((p) => String(p.id) !== String(id)))
  }

  function adjustStock(id, delta) {
    setProducts((prev) => {
      const next = prev.map((product) =>
        String(product.id) === String(id)
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

  // Product seeding is intentionally disabled: MySQL is the only source of products.
  function seedProducts() {
    return 0
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
