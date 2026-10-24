import { useNavigate } from 'react-router-dom'

const features = [
  { icon: '🛍️', title: 'Shop Shoes', desc: 'Browse shoes from the same marketplace, choose your size, add to cart, and place an order.' },
  { icon: '🏪', title: 'Start Selling', desc: 'Switch to Seller Mode, create your shop, and list your own shoes on the marketplace.' },
  { icon: '🔔', title: 'Order Alerts', desc: 'Sellers receive notifications when customers order their products and when order status changes.' },
  { icon: '👤', title: 'One Account, Two Modes', desc: 'Use one account as a customer or seller and switch modes whenever you need.' },
]

function Home() {
  const navigate = useNavigate()

  return (
    <div className="shoe-landing">
      <nav className="navbar navbar-expand-lg navbar-dark shoe-navbar sticky-top">
        <div className="container py-2">
          <a className="navbar-brand d-flex align-items-center gap-2 fw-bold" href="#home">
            <span className="shoe-logo-mark">S</span>
            <span>SHOE <span className="text-warning">TAKA</span></span>
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#shoeNav" aria-controls="shoeNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="shoeNav">
            <ul className="navbar-nav mx-auto mb-3 mb-lg-0 gap-lg-3">
              <li className="nav-item"><a className="nav-link active" href="#home">HOME</a></li>
              <li className="nav-item"><a className="nav-link" href="#about">ABOUT US</a></li>
              <li className="nav-item"><a className="nav-link" href="#features">FEATURES</a></li>
              <li className="nav-item"><a className="nav-link" href="#inventory">INVENTORY</a></li>
              <li className="nav-item"><a className="nav-link" href="#contact">CONTACT</a></li>
            </ul>
            <div className="d-flex gap-2">
              <button className="btn shoe-btn-outline" onClick={() => navigate('/login')}>LOG IN</button>
              <button className="btn shoe-btn-yellow" onClick={() => navigate('/signup')}>SIGN UP</button>
            </div>
          </div>
        </div>
      </nav>

      <header id="home" className="shoe-hero">
        <div className="container position-relative">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="shoe-kicker">SHOE TAKA INVENTORY SYSTEM</div>
              <h1 className="display-3 fw-black text-white mb-3">BUY. SELL. <span className="text-warning">GROW.</span><br />ALL IN <span className="text-warning">SHOE TAKA.</span></h1>
              <p className="lead text-white mb-3">A simple marketplace where customers can shop and sellers can grow their shoe business.</p>
              <p className="shoe-hero-copy">Browse products, place orders, start selling, manage your shop, and receive order notifications from one account.</p>
             
            </div>
            <div className="col-lg-6 text-center">
              <div className="hero-shoe-frame">
                <img src="/items/Airjordan 1.jpeg" alt="Featured Shoe" className="img-fluid hero-shoe-image" />
              </div>
            </div>
          </div>
          <div className="hero-shoe-deco deco-one">✦</div>
          <div className="hero-shoe-deco deco-two">◌</div>
        </div>
      </header>

      <section id="about" className="py-5 shoe-light-section">
        <div className="container py-lg-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="shoe-image-card">
                <img src="/images/ADIDAS.jpg" alt="Shoe collection" className="img-fluid" />
              </div>
            </div>
            <div className="col-lg-6">
              <div className="section-label">ABOUT US</div>
              <h2 className="section-heading">Everything You Need to Shop and Sell Shoes</h2>
              <p><strong>Shoe Taka</strong> connects customers and sellers in one simple marketplace.</p>
              <p>Customers can discover products and place orders, while sellers can add products, manage orders, update their shop profile, and receive notifications.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-5 shoe-dark-section">
        <div className="container py-lg-4">
          <div className="section-label text-warning">WHAT CAN YOU MANAGE?</div>
          <h2 className="section-heading text-white mb-5">Shopping and Selling Made Easier</h2>
          <div className="row g-4">
            {features.map((feature) => (
              <div className="col-12 col-sm-6 col-lg-3" key={feature.title}>
                <div className="feature-card h-100">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="text-dark" >{feature.title}</h3>
                  <p className='text-dark'>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="inventory" className="py-5 shoe-light-section">
        <div className="container py-lg-4">
          <div className="row g-4 align-items-center">
            <div className="col-lg-7">
              <div className="section-label">WHY SHOE TAKA?</div>
              <h2 className="section-heading">One Marketplace. Two Modes.</h2>
              <div className="row g-4 mt-2">
                <div className="col-md-6"><div className="benefit"><span>01</span><div><h5>Organized</h5><p>Keep your shoe inventory information in one place.</p></div></div></div>
                <div className="col-md-6"><div className="benefit"><span>02</span><div><h5>Efficient</h5><p>Reduce the time spent manually checking products.</p></div></div></div>
                <div className="col-md-6"><div className="benefit"><span>03</span><div><h5>Easy to Manage</h5><p>Update product details, sizes, and stock quantities with ease.</p></div></div></div>
                <div className="col-md-6"><div className="benefit"><span>04</span><div><h5>Reliable Records</h5><p>Maintain accurate inventory data and avoid stock errors.</p></div></div></div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="inventory-visual">
                <img src="/items/Jordan_last dance.webp" alt="Shoe inventory" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shoe-cta py-5">
        <div className="container text-center py-4">
          <div className="section-label text-warning">GET STARTED</div>
          <h2 className="display-6 fw-bold text-white">Ready to Shop or Start Selling?</h2>
          <p className="text-white-50 mx-auto shoe-cta-copy">Create one account and switch between Customer Mode and Seller Mode whenever you need.</p>
          <div className="d-flex justify-content-center align-items-center flex-wrap gap-3 mt-4">
            <button className="btn btn-lg shoe-btn-yellow px-5" onClick={() => navigate('/signup')}>SIGN UP</button>
            <span className="text-white-50">Already have an account?</span>
            <button className="btn btn-link text-warning fw-bold text-decoration-none" onClick={() => navigate('/login')}>LOG IN</button>
          </div>
        </div>
      </section>

      <footer id="contact" className="shoe-footer py-4">
        <div className="container">
          <div className="row align-items-center g-3">
            <div className="col-md-5">
              <div className="fw-bold text-white fs-5">SHOE <span className="text-warning">TAKA</span></div>
              <small className="text-white-50">Smart inventory management for a better shoe store.</small>
            </div>
            <div className="col-md-7 text-md-end">
              <a href="#home">HOME</a><a href="#about">ABOUT US</a><a href="#features">FEATURES</a><a href="#inventory">INVENTORY</a><a href="#contact">CONTACT</a>
            </div>
          </div>
          <hr className="border-secondary my-3" />
          <small className="text-white-50">© 2026 Shoe Taka. All rights reserved.</small>
        </div>
      </footer>
    </div>
  )
}

export default Home
