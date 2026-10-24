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
    setAllOrders(getAllOrders())
    setNotifications(getNotifications(uid))
  }, [uid])

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
  function addToCart(productId, size) {
    const product = products.find((item) => item.id === productId)
    const key = makeCartKey(productId, size)

    if (!product || product.stock <= 0) return

    setCart((prev) => {
      const currentQty = prev[key] || 0
      if (currentQty >= product.stock) return prev
      return {
        ...prev,
        [key]: currentQty + 1,
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

  async function placeOrder(buyer, paymentMethod) {
    if (!uid) throw new Error('Please log in to place an order.')

    const items = Object.entries(cart)
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

    const order = {
      id: createId('order'),
      orderNumber: `ORD-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      userId: uid,
      userEmail: firebaseUser?.email || '',
      buyer,
      paymentMethod,
      items,
      total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: 'New',
      placedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const nextOrders = [order, ...allOrders]
    saveAllOrders(nextOrders)
    setAllOrders(nextOrders)

    // TEMPORARY FRONTEND INVENTORY UPDATE:
    // When Express is connected, move this stock deduction into the server.
    const quantitiesByProduct = {}
    items.forEach((item) => {
      quantitiesByProduct[item.productId] =
        (quantitiesByProduct[item.productId] || 0) + item.qty
    })
    Object.entries(quantitiesByProduct).forEach(([productId, qty]) => {
      const product = products.find((item) => item.id === productId)
      if (product) {
        adjustStock(productId, -qty)
      }
    })

    // Create one seller notification per seller represented in the order.
    const sellerIds = [
      ...new Set(items.map((item) => item.sellerId).filter(Boolean)),
    ]

    sellerIds.forEach((sellerId) => {
      const sellerItems = items.filter((item) => item.sellerId === sellerId)
      const sellerTotal = sellerItems.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
      )
      addNotification(sellerId, {
        type: 'order',
        title: 'New Order Received',
        message: `${buyer.name || 'A customer'} ordered ${sellerItems[0].name}${sellerItems.length > 1 ? ` and ${sellerItems.length - 1} more item(s)` : ''}.`,
        orderId: order.id,
        amount: sellerTotal,
      })
    })

    // Customer gets a confirmation notification too.
    addNotification(uid, {
      type: 'order',
      title: 'Order Placed',
      message: `Your order ${order.orderNumber} has been received.`,
      orderId: order.id,
      amount: order.total,
    })

    refreshNotifications()
    clearCart()
    return order
  }

  async function cancelOrder(orderId) {
    const order = allOrders.find((item) => item.id === orderId)
    if (!order || order.userId !== uid) throw new Error('Order not found.')
    if (order.status !== 'New' && order.status !== 'Processing') {
      throw new Error('This order can no longer be cancelled.')
    }

    const updated = {
      ...order,
      status: 'Cancelled',
      updatedAt: new Date().toISOString(),
    }
    const next = allOrders.map((item) => (item.id === orderId ? updated : item))
    saveAllOrders(next)
    setAllOrders(next)

    // TEMPORARY FRONTEND INVENTORY UPDATE:
    // Restore stock when a cancellable order is cancelled.
    const quantitiesByProduct = {}
    order.items.forEach((item) => {
      quantitiesByProduct[item.productId] =
        (quantitiesByProduct[item.productId] || 0) + item.qty
    })
    Object.entries(quantitiesByProduct).forEach(([productId, qty]) => {
      const product = products.find((item) => item.id === productId)
      if (product) {
        adjustStock(productId, qty)
      }
    })

    const sellerIds = [
      ...new Set(order.items.map((item) => item.sellerId).filter(Boolean)),
    ]
    sellerIds.forEach((sellerId) => {
      addNotification(sellerId, {
        type: 'cancel',
        title: 'Order Cancelled',
        message: `${buyerLabel(order)} cancelled order ${order.orderNumber}.`,
        orderId: order.id,
        amount: order.total,
      })
    })
    refreshNotifications()
  }

  function buyerLabel(order) {
    return order.buyer?.name || order.userEmail || 'Customer'
  }

  async function setOrderStatus(orderId, status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }

    const order = allOrders.find((item) => item.id === orderId)
    if (!order) throw new Error('Order not found.')

    const ownsOrder = order.items?.some((item) => item.sellerId === uid)
    if (!isAdmin && !ownsOrder) {
      throw new Error('You do not have permission to update this order.')
    }

    const updated = {
      ...order,
      status,
      updatedAt: new Date().toISOString(),
    }
    const next = allOrders.map((item) => (item.id === orderId ? updated : item))
    saveAllOrders(next)
    setAllOrders(next)

    addNotification(order.userId, {
      type: status === 'Cancelled' ? 'cancel' : 'status',
      title: status === 'Cancelled' ? 'Order Cancelled' : 'Order Status Updated',
      message: `${order.orderNumber} is now ${status}.`,
      orderId: order.id,
      amount: order.total,
    })
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
