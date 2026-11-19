import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useProducts } from './ProductsContext.jsx'
import { useUser } from './UserContext.jsx'
import {
  STORAGE_KEYS,
  readJSON,
  readUserValue,
  writeUserValue,
  writeJSON,
  createId,
} from '../data/storage.js'

export const ORDER_STATUSES = [
  'New',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
]

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const ORDERS_API_URL = `${API_URL}/api/orders`

const CartContext = createContext(null)

export function parseCartKey(cartKey) {
  const [productId, size] = cartKey.split('::')
  return { productId, size }
}

function makeCartKey(productId, size) {
  return `${productId}::${size}`
}

function getAllOrders() {
  // TEMPORARY LOCAL STORAGE:
  // Replace with GET /api/orders later.
  const saved = readJSON(STORAGE_KEYS.orders, [])
  return Array.isArray(saved) ? saved : []
}

function saveAllOrders(orders) {
  // TEMPORARY LOCAL STORAGE:
  // Replace with POST/PATCH /api/orders later.
  writeJSON(STORAGE_KEYS.orders, orders)
}

function getNotifications(uid) {
  // TEMPORARY LOCAL STORAGE:
  // Replace with GET /api/notifications/:uid later.
  return readUserValue(STORAGE_KEYS.notifications, uid, [])
}

function saveNotifications(uid, notifications) {
  // TEMPORARY LOCAL STORAGE:
  // Replace with POST/PATCH /api/notifications later.
  writeUserValue(STORAGE_KEYS.notifications, uid, notifications)
}

function addNotification(uid, notification) {
  if (!uid) return
  const current = getNotifications(uid)
  saveNotifications(uid, [
    {
      id: createId('notification'),
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    },
    ...current,
  ])
}

function updateNotificationReadState(uid, ids = null) {
  const current = getNotifications(uid)
  const next = current.map((item) => {
    if (!ids || ids.includes(item.id)) return { ...item, read: true }
    return item
  })
  saveNotifications(uid, next)
  return next
}

export function CartProvider({ children }) {
  const { products, adjustStock } = useProducts()
  const { firebaseUser, isAdmin, isSellerMode } = useUser()
  const uid = firebaseUser?.uid || null

  // ---------------- Temporary frontend cart ----------------
  const [cart, setCart] = useState({})
  const [cartReadyKey, setCartReadyKey] = useState(null)

  const cartStorageKey = `${STORAGE_KEYS.carts}:${uid || 'guest'}`

  useEffect(() => {
    // TEMPORARY LOCAL STORAGE:
    // Replace cart loading with GET /api/cart/:uid later.
    const saved = readJSON(cartStorageKey, {})
    setCart(saved && typeof saved === 'object' ? saved : {})
    setCartReadyKey(cartStorageKey)
  }, [cartStorageKey])

  useEffect(() => {
    if (cartReadyKey !== cartStorageKey) return

    // TEMPORARY LOCAL STORAGE:
    // Replace cart saving with PUT /api/cart/:uid later.
    writeJSON(cartStorageKey, cart)
  }, [cart, cartReadyKey, cartStorageKey])

  // ---------------- Temporary frontend orders ----------------
  const [allOrders, setAllOrders] = useState(() => getAllOrders())
  const [notifications, setNotifications] = useState(() => getNotifications(uid))
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    let active = true
    setNotifications(getNotifications(uid))

    async function loadOrders() {
      if (!firebaseUser) {
        setAllOrders([])
        setOrdersError('')
        return
      }
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch(ORDERS_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => [])
        if (!response.ok) throw new Error(data.message || 'Could not load orders.')
        if (active) {
          setAllOrders(Array.isArray(data) ? data : [])
          setOrdersError('')
        }
      } catch (error) {
        if (active) setOrdersError(error.message || 'Could not load orders.')
      }
    }

    loadOrders()
    return () => { active = false }
  }, [uid, firebaseUser])

  const orders = useMemo(
    () =>
      allOrders
        .filter((order) => order.userId === uid)
        .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)),
    [allOrders, uid]
  )

  const sellerOrders = useMemo(() => {
    if (!uid) return []
    return allOrders
      .filter((order) =>
        order.items?.some((item) => item.sellerId === uid)
      )
      .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
  }, [allOrders, uid])

  const unreadNotifications = notifications.filter((item) => !item.read).length

  function refreshNotifications() {
    setNotifications(getNotifications(uid))
  }

  // ---------------- Cart actions ----------------
  function addToCart(productId, size, quantity = 1) {
    const product = products.find((item) => item.id === productId)
    const key = makeCartKey(productId, size)

    if (!product || product.stock <= 0 || !Number.isInteger(quantity) || quantity < 1) return

    setCart((prev) => {
      const currentQty = prev[key] || 0
      if (currentQty + quantity > product.stock) return prev
      return {
        ...prev,
        [key]: currentQty + quantity,
      }
    })
  }

  function changeQuantity(cartKey, delta) {
    setCart((prev) => {
      const nextQty = (prev[cartKey] || 0) + delta
      const next = { ...prev }
      if (nextQty <= 0) delete next[cartKey]
      else next[cartKey] = nextQty
      return next
    })
  }

  function removeFromCart(cartKey) {
    setCart((prev) => {
      const next = { ...prev }
      delete next[cartKey]
      return next
    })
  }

  function clearCart() {
    setCart({})
  }

  async function placeOrder(buyer, paymentMethod, selectedCart = cart) {
    if (!uid) throw new Error('Please log in to place an order.')

    const items = Object.entries(selectedCart)
      .map(([cartKey, qty]) => {
        const { productId, size } = parseCartKey(cartKey)
        const product = products.find((p) => p.id === productId)
        if (!product) return null

        return {
          id: cartKey,
          productId,
          sellerId: product.sellerId || null,
          name: product.name,
          img: product.image,
          price: product.priceValue,
          size,
          qty,
        }
      })
      .filter(Boolean)

    if (items.length === 0) return null

    const token = await firebaseUser.getIdToken()
    const response = await fetch(ORDERS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        buyer,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          qty: item.qty,
        })),
      }),
    })
    const savedOrder = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(savedOrder.message || 'Could not place order.')

    setAllOrders((previous) => [savedOrder, ...previous.filter((item) => item.id !== savedOrder.id)])
    setOrdersError('')
    setCart((currentCart) => {
      const remaining = { ...currentCart }
      Object.keys(selectedCart).forEach((cartKey) => delete remaining[cartKey])
      return remaining
    })
    return savedOrder
  }

  async function cancelOrder(orderId) {
    const order = allOrders.find((item) => item.id === orderId)
    if (!order || order.userId !== uid) throw new Error('Order not found.')
    if (order.status !== 'New' && order.status !== 'Processing') {
      throw new Error('This order can no longer be cancelled.')
    }
    const token = await firebaseUser.getIdToken()
    const response = await fetch(`${ORDERS_API_URL}/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'Cancelled' }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Could not cancel order.')
    setAllOrders((previous) => previous.map((item) =>
      item.id === orderId ? { ...item, status: 'Cancelled' } : item
    ))
  }

  function buyerLabel(order) {
    return order.buyer?.name || order.userEmail || 'Customer'
  }

  async function setOrderStatus(orderId, status) {
    if (!ORDER_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`)
    const token = await firebaseUser.getIdToken()
    const response = await fetch(`${ORDERS_API_URL}/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Could not update order status.')
    setAllOrders((previous) => previous.map((item) =>
      item.id === orderId ? { ...item, status } : item
    ))
  }

  function deleteOrder(orderId) {
    if (!isAdmin) throw new Error('Admin access required.')
    const next = allOrders.filter((order) => order.id !== orderId)
    saveAllOrders(next)
    setAllOrders(next)
  }

  function markOrdersSeen() {
    // Kept for compatibility with the existing Orders page.
    refreshNotifications()
  }

  function markNotificationsRead(ids = null) {
    const next = updateNotificationReadState(uid, ids)
    setNotifications(next)
  }

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)

  const cartTotal = Object.entries(cart).reduce((sum, [cartKey, qty]) => {
    const { productId } = parseCartKey(cartKey)
    const product = products.find((p) => p.id === productId)
    return sum + (product ? product.priceValue * qty : 0)
  }, 0)

  const value = {
    cart,
    addToCart,
    changeQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    orders,
    allOrders: isAdmin ? allOrders : [],
    sellerOrders,
    ordersError,
    placeOrder,
    markOrdersSeen,
    cancelOrder,
    setOrderStatus,
    deleteOrder,
    notifications,
    unreadNotifications,
    markNotificationsRead,
    hasNewOrder: unreadNotifications > 0,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
