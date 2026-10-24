import { Navigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import FullPageLoader from './FullPageLoader.jsx'

// Any logged-in Firebase user can pass.
export default function RequireAuth({ children }) {
  const { loading, firebaseUser } = useUser()

  if (loading) return <FullPageLoader />
  if (!firebaseUser) return <Navigate to="/login" replace />

  return children
}
