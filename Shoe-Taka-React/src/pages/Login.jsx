import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'

// Friendly messages for the most common Firebase Auth errors
const AUTH_ERRORS = {
  'auth/email-already-in-use': 'This email is already registered. Please log in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account was found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
}

function Login({ initialMode = 'login' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const navigate = useNavigate()
  const { login, signup, loginWithGoogle } = useUser()

  // After a successful login App.jsx redirects automatically:
  // admins -> /admin, everyone else -> /store (based on the Firestore role).

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password || (mode === 'signup' && !name.trim())) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await signup(name, email, password)
      } else {
        await login(email, password)
      }
    } catch (err) {
      console.error('Firebase authentication error:', err)
      setError(
        AUTH_ERRORS[err.code] ||
          err.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      console.error('Google authentication error:', err)
      setError(
        AUTH_ERRORS[err.code] ||
          err.message ||
          'Google sign-in failed. Please try again.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  function toggleMode() {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="login-wrap shoe-login-wrap">
      <div className="login-card shoe-login-card shadow-lg">

        {/* Back button */}
        <button
          className="btn btn-link text-decoration-none text-secondary mb-3 p-0"
          onClick={() => navigate('/')}
        >
          ← Back to Shoe Taka
        </button>

        {/* Header */}
        <div className="text-center mb-4">

          

          <h1 className="fw-bold mb-1">
            {mode === 'login'
              ? 'Welcome Back'
              : 'Create Your Account'}
          </h1>

          <p className="text-muted">
            {mode === 'login'
              ? 'Log in to continue to Shoe Taka.'
              : 'Join Shoe Taka and manage your shoe inventory.'}
          </p>

        </div>

        {/* Login / Signup form */}
        <form onSubmit={handleSubmit}>

          {/* Name - Signup only */}
          {mode === 'signup' && (
            <div className="mb-3">

              <label
                htmlFor="name"
                className="form-label"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                className="form-control"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />

            </div>
          )}

          {/* Email */}
          <div className="mb-3">

            <label
              htmlFor="email"
              className="form-label"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="Enter email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </div>

          {/* Password */}
          <div className="mb-3">

            <label
              htmlFor="password"
              className="form-label"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

          </div>

          {/* Error */}
          {error && (
            <div className="text-danger small mb-3">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="d-grid gap-2">

            <button
              type="submit"
              className="btn shoe-btn-yellow py-2"
              disabled={loading || googleLoading}
            >
              {loading
                ? mode === 'login'
                  ? 'LOGGING IN...'
                  : 'CREATING ACCOUNT...'
                : mode === 'login'
                  ? 'LOG IN'
                  : 'CREATE ACCOUNT'}
            </button>

            <button
              type="button"
              className="btn btn-outline-dark py-2"
              onClick={toggleMode}
              disabled={loading || googleLoading}
            >
              {mode === 'login'
                ? 'Create New Account'
                : 'Back to Login'}
            </button>

          </div>
        </form>

        {/* Divider */}
        <div className="d-flex align-items-center my-3">

          <hr className="flex-grow-1" />

          <span className="px-2 small text-muted">
            or
          </span>

          <hr className="flex-grow-1" />

        </div>

        {/* Google */}
        <button
          type="button"
          className="btn btn-outline-dark w-100 py-2 d-flex align-items-center justify-content-center gap-2"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >

          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            width={18}
            height={18}
          />

          {googleLoading
            ? 'Signing in...'
            : 'Sign in with Google'}

        </button>

      </div>
    </div>
  )
}

export default Login
