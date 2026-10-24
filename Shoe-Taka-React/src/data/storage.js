// TEMPORARY FRONTEND STORAGE
// ------------------------------------------------------------
// This file is intentionally using localStorage so the frontend can run
// without an Express/server.js backend.
//
// When you connect Express later, replace the functions in this file with
// API requests. The rest of the React UI should not need to change.
// ------------------------------------------------------------

const PREFIX = 'shoeTaka:'

export const STORAGE_KEYS = {
  mode: `${PREFIX}mode`,
  sellerProfile: `${PREFIX}sellerProfile`,
  products: `${PREFIX}products`,
  carts: `${PREFIX}carts`,
  orders: `${PREFIX}orders`,
  notifications: `${PREFIX}notifications`,
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value = JSON.parse(raw)
    return value ?? fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  // TEMPORARY LOCAL STORAGE - replace with your Express API later.
  localStorage.setItem(key, JSON.stringify(value))
}

export function getUserKey(uid) {
  return uid || 'guest'
}

export function readUserMap(key) {
  const map = readJSON(key, {})
  return map && typeof map === 'object' ? map : {}
}

export function writeUserMap(key, map) {
  writeJSON(key, map)
}

export function readUserValue(key, uid, fallback = null) {
  const map = readUserMap(key)
  return map[getUserKey(uid)] ?? fallback
}

export function writeUserValue(key, uid, value) {
  const map = readUserMap(key)
  map[getUserKey(uid)] = value
  writeUserMap(key, map)
}

export function removeUserValue(key, uid) {
  const map = readUserMap(key)
  delete map[getUserKey(uid)]
  writeUserMap(key, map)
}

export function createId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
