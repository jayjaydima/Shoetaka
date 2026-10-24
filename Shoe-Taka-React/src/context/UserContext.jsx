import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateAuthProfile,
} from 'firebase/auth'
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase.js'
import {
  STORAGE_KEYS,
  readUserValue,
  writeUserValue,
} from '../data/storage.js'

const UserContext = createContext(null)

const DEFAULT_SELLER_PROFILE = {
  shopName: '',
  sellerName: '',
  phone: '',
  address: '',
  description: '',
  photoURL: '',
}

export function UserProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [profileState, setProfileState] = useState({
    uid: null,
    data: null,
    fromCache: false,
  })
  // Firestore may first answer from its local cache, which can hold an old
  // role (e.g. "student" before the account was made admin). We wait for the
  // server copy before deciding where to send the user; if the server cannot
  // be reached (offline) we fall back to the cached copy after a short wait.
  const [cacheGraceOver, setCacheGraceOver] = useState(false)

  // TEMPORARY LOCAL STORAGE:
  // Customer/Seller mode is stored locally until you connect your backend.
  const [mode, setModeState] = useState('customer')
  const [sellerProfile, setSellerProfile] = useState(DEFAULT_SELLER_PROFILE)

  const pendingNameRef = useRef('')
  const creatingRef = useRef(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      setInitializing(false)
    })
  }, [])

  const uid = firebaseUser?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setModeState('customer')
      setSellerProfile(DEFAULT_SELLER_PROFILE)
      setProfileState({ uid: null, data: null, fromCache: false })
      setCacheGraceOver(false)
      return undefined
    }

    setCacheGraceOver(false)
    const graceTimer = setTimeout(() => setCacheGraceOver(true), 3000)

    // TEMPORARY LOCAL STORAGE:
    // Replace this read with GET /api/users/:uid/preferences later.
    const savedMode = readUserValue(STORAGE_KEYS.mode, uid, 'customer')
    const savedSeller = readUserValue(
      STORAGE_KEYS.sellerProfile,
      uid,
      DEFAULT_SELLER_PROFILE
    )
    setModeState(savedMode === 'seller' ? 'seller' : 'customer')
    setSellerProfile({ ...DEFAULT_SELLER_PROFILE, ...savedSeller })

    const ref = doc(db, 'users', uid)

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const fromCache = snap.metadata.fromCache
        if (snap.exists()) {
          setProfileState({ uid, data: snap.data(), fromCache })
          return
        }

        if (fromCache || creatingRef.current) return
        creatingRef.current = true

        const current = auth.currentUser
        const displayName =
          pendingNameRef.current || current?.displayName || ''
        pendingNameRef.current = ''

        setDoc(ref, {
          uid,
          displayName,
          email: current?.email || '',
          photoURL: current?.photoURL || '',
          phone: '',
          address: '',
          role: 'student',
          createdAt: serverTimestamp(),
        })
          .catch((err) => {
            console.error('Could not create user profile:', err)
            setProfileState({ uid, data: null, fromCache: false })
          })
          .finally(() => {
            creatingRef.current = false
          })
      },
      (err) => {
        console.error('Could not read user profile:', err)
        setProfileState({ uid, data: null, fromCache: false })
      }
    )

    return () => {
      clearTimeout(graceTimer)
      unsubscribe()
    }
  }, [uid])

  const profileReady = uid
    ? profileState.uid === uid &&
      (!profileState.fromCache || cacheGraceOver)
    : true
  const profile = uid && profileState.uid === uid ? profileState.data : null

  const loading = initializing || !profileReady
  const role = firebaseUser && profileReady ? profile?.role || 'student' : null
  const isAdmin = role === 'admin'
  const isStudent = role === 'student'

  const user = useMemo(() => {
    if (!firebaseUser) return null
    return {
      uid: firebaseUser.uid,
      name: profile?.displayName || firebaseUser.displayName || '',
      email: profile?.email || firebaseUser.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      photoURL: profile?.photoURL || firebaseUser.photoURL || '',
      role,
    }
  }, [firebaseUser, profile, role])

  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signup = useCallback(async (name, email, password) => {
    pendingNameRef.current = name.trim()
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
      await updateAuthProfile(cred.user, { displayName: name.trim() })
    } catch (err) {
      pendingNameRef.current = ''
      throw err
    }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const updateProfile = useCallback(async ({ name, phone, address }) => {
    const current = auth.currentUser
    if (!current) throw new Error('You are not logged in.')

    const changes = { updatedAt: serverTimestamp() }
    if (name !== undefined) changes.displayName = name
    if (phone !== undefined) changes.phone = phone
    if (address !== undefined) changes.address = address

    await updateDoc(doc(db, 'users', current.uid), changes)

    if (name !== undefined && current.displayName !== name) {
      updateAuthProfile(current, { displayName: name }).catch(() => {})
    }
  }, [])

  const switchMode = useCallback(
    (nextMode) => {
      if (nextMode !== 'customer' && nextMode !== 'seller') return
      setModeState(nextMode)

      // TEMPORARY LOCAL STORAGE:
      // Replace this with your Express user-preference endpoint later.
      if (uid) writeUserValue(STORAGE_KEYS.mode, uid, nextMode)
    },
    [uid]
  )

  const updateSellerProfile = useCallback(
    (updates) => {
      const next = {
        ...DEFAULT_SELLER_PROFILE,
        ...sellerProfile,
        ...updates,
      }
      setSellerProfile(next)

      // TEMPORARY LOCAL STORAGE:
      // Replace this with POST/PATCH /api/seller/profile later.
      if (uid) writeUserValue(STORAGE_KEYS.sellerProfile, uid, next)
    },
    [sellerProfile, uid]
  )

  const value = {
    user,
    firebaseUser,
    role,
    isAdmin,
    isStudent,
    isAuthed: !!firebaseUser,
    loading,
    initializing,
    mode,
    isSellerMode: mode === 'seller',
    switchMode,
    sellerProfile,
    updateSellerProfile,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateProfile,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
