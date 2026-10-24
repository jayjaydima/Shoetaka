function FullPageLoader({ message = 'Checking your account...' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <h2>Loading...</h2>
      <p>{message}</p>
    </div>
  )
}

export default FullPageLoader
