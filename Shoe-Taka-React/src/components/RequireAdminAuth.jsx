import { Navigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import FullPageLoader from './FullPageLoader.jsx'

// Only accounts whose Firestore profile (users/{uid}) has role "admin".
// This only decides what the UI shows - the real protection is in
// firestore.rules, which checks the same role on the server.
export default function RequireAdminAuth({ children }) {
  const { loading, firebaseUser, isAdmin } = useUser()

  if (loading) return <FullPageLoader message="Checking admin access..." />
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/store" replace />

  return children
}
