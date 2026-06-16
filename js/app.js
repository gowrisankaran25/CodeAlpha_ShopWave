/* ═══════════════════════════════════════════
   ShopWave – Frontend SPA
═══════════════════════════════════════════ */

// ── State ────────────────────────────────────
let state = {
  page: 'home',
  user: null,
  cart: JSON.parse(localStorage.getItem('sw_cart') || '[]'),
  products: [],
  categories: [],
  filters: { category: 'All', sort: 'id_asc', search: '', page: 1 },
  currentProduct: null,
  orders: [],
};

// ── Bootstrap ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadCategories();
  renderCartBadge();
  navigate('home');
  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    if (e.state?.page) navigate(e.state.page, e.state.params, false);
  });
});

// ── Routing ───────────────────────────────────
async function navigate(page, params = {}, pushState = true) {
  state.page = page;
  if (pushState) history.pushState({ page, params }, '', `#${page}`);
  const app = document.getElementById('app');
  app.innerHTML = '<div style="padding:80px;text-align:center;color:#6B6B6B">Loading…</div>';
  switch (page) {
    case 'home':    await renderHome(params); break;
    case 'product': await renderProduct(params.id); break;
    case 'cart':    renderCart(); break;
    case 'checkout':renderCheckout(); break;
    case 'orders':  await renderOrders(); break;
    case 'order':   await renderOrderDetail(params.id); break;
    default:        navigate('home');
  }
}

// ── API helper ────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth ──────────────────────────────────────
async function checkAuth() {
  try {
    const { user } = await api('GET', '/api/auth/me');
    state.user = user;
    updateAuthUI();
  } catch(e) {}
}

function updateAuthUI() {
  const loggedIn  = document.getElementById('loggedIn');
  const loggedOut = document.getElementById('loggedOut');
  const nameEl    = document.getElementById('userName');
  if (state.user) {
    loggedIn.style.display  = 'block';
    loggedOut.style.display = 'none';
    nameEl.textContent = state.user.name;
  } else {
    loggedIn.style.display  = 'none';
    loggedOut.style.display = 'block';
  }
}

async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const { user } = await api('POST', '/api/auth/login', { email, password });
    state.user = user;
    updateAuthUI();
    closeModal();
    showToast(`Welcome back, ${user.name}!`, 'success');
  } catch(e) { errEl.textContent = e.message; }
}

async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl    = document.getElementById('regError');
  errEl.textContent = '';
  try {
    const { user } = await api('POST', '/api/auth/register', { name, email, password });
    state.user = user;
    updateAuthUI();
    closeModal();
    showToast(`Welcome, ${user.name}!`, 'success');
  } catch(e) { errEl.textContent = e.message; }
}

async function logout() {
  await api('POST', '/api/auth/logout');
  state.user = null;
  updateAuthUI();
  closeModal();
  toggleUserMenu(false);
  showToast('Signed out');
  navigate('home');
}

// ── Modal ──────────────────────────────────────
function openModal(type) {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalLogin').style.display    = type === 'login'    ? 'block' : 'none';
  document.getElementById('modalRegister').style.display = type === 'register' ? 'block' : 'none';
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent   = '';
  toggleUserMenu(false);
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ── User dropdown ──────────────────────────────
function toggleUserMenu(force) {
  const dd = document.getElementById('userDropdown');
  if (force === false) { dd.classList.remove('open'); return; }
  dd.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) toggleUserMenu(false);
});

// ── Toast ──────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 3200);
}

// ── Cart persistence ───────────────────────────
function saveCart() { localStorage.setItem('sw_cart', JSON.stringify(state.cart)); }

function renderCartBadge() {
  const total = state.cart.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cartBadge').textContent = total;
}

function addToCart(product, qty = 1) {
  const existing = state.cart.find(i => i.id === product.id);
  if (existing) existing.quantity += qty;
  else state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: qty, stock: product.stock });
  saveCart();
  renderCartBadge();
  showToast(`${product.name} added to cart`, 'success');
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  renderCartBadge();
  renderCart();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.quantity = Math.max(1, Math.min(item.stock, item.quantity + delta));
  saveCart();
  renderCartBadge();
  renderCart();
}

// ── Categories ────────────────────────────────
async function loadCategories() {
  state.categories = await api('GET', '/api/products/categories');
}

// ── Home page ──────────────────────────────────
async function renderHome(params = {}) {
  if (params.category) state.filters.category = params.category;
  if (params.search)   state.filters.search   = params.search;
  if (params.page)     state.filters.page      = params.page;

  const qs = new URLSearchParams({
    category: state.filters.category,
    sort:     state.filters.sort,
    search:   state.filters.search,
    page:     state.filters.page,
    limit:    12,
  }).toString();

  const { products, total, pages } = await api('GET', `/api/products?${qs}`);
  state.products = products;

  const app = document.getElementById('app');
  app.innerHTML = `
    ${state.filters.page === 1 && !state.filters.search ? heroHTML() : ''}
    <div class="filter-bar">
      <h3>Category</h3>
      ${state.categories.map(c => `
        <button class="chip ${c === state.filters.category ? 'active' : ''}"
          onclick="setCategory('${c}')">${c}</button>
      `).join('')}
      <select class="sort-select" onchange="setSort(this.value)">
        <option value="id_asc"      ${state.filters.sort==='id_asc'?'selected':''}>Featured</option>
        <option value="price_asc"   ${state.filters.sort==='price_asc'?'selected':''}>Price: Low→High</option>
        <option value="price_desc"  ${state.filters.sort==='price_desc'?'selected':''}>Price: High→Low</option>
        <option value="rating"      ${state.filters.sort==='rating'?'selected':''}>Top Rated</option>
        <option value="newest"      ${state.filters.sort==='newest'?'selected':''}>Newest</option>
      </select>
    </div>
    ${state.filters.search ? `<p style="margin-bottom:20px;color:var(--slate)">Showing results for "<strong>${state.filters.search}</strong>" — ${total} found</p>` : ''}
    <div class="product-grid">
      ${products.length ? products.map(productCardHTML).join('') : emptyHTML('No products found', 'Try a different search or category.')}
    </div>
    ${paginationHTML(state.filters.page, pages)}
  `;
}

function heroHTML() {
  return `
    <div class="hero">
      <div class="hero-tag">New Arrivals · Free Shipping Over ₹5000</div>
      <h1>Things worth<br><em>owning well.</em></h1>
      <p class="hero-sub">Curated goods for people who care about what they bring into their lives.</p>
      <div class="hero-actions">
        <button class="btn-amber" onclick="setCategory('Electronics')">Shop Electronics</button>
        <button class="btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.3)"
          onclick="setCategory('All')">Browse All</button>
      </div>
    </div>
  `;
}

function productCardHTML(p) {
  const stars = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
  return `
    <div class="product-card" onclick="navigate('product',{id:${p.id}})">
      <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy"
           onerror="this.onerror=null;this.src='https://picsum.photos/seed/fallback${p.id}/400/400'" />
      <div class="product-info">
        <div class="product-cat">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-text">${p.rating} (${p.reviews})</span>
        </div>
        <div class="product-footer">
          <span class="product-price">₹${p.price.toFixed(2)}</span>
          ${p.stock > 0
            ? `<button class="add-btn" onclick="event.stopPropagation();quickAdd(${p.id})">+ Cart</button>`
            : `<span class="out-of-stock">Out of stock</span>`}
        </div>
      </div>
    </div>
  `;
}

async function quickAdd(productId) {
  const p = state.products.find(x => x.id === productId);
  if (p) addToCart(p, 1);
}

function paginationHTML(current, total) {
  if (total <= 1) return '';
  let html = '<div class="pagination">';
  if (current > 1) html += `<button class="page-btn" onclick="goPage(${current-1})">← Prev</button>`;
  for (let i = 1; i <= total; i++) {
    html += `<button class="page-btn ${i===current?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (current < total) html += `<button class="page-btn" onclick="goPage(${current+1})">Next →</button>`;
  html += '</div>';
  return html;
}

function emptyHTML(title, sub) {
  return `<div class="empty-state" style="grid-column:1/-1">
    <div class="icon">🔍</div><h3>${title}</h3><p>${sub}</p></div>`;
}

function setCategory(cat) {
  state.filters.category = cat;
  state.filters.page = 1;
  navigate('home');
}
function setSort(val) { state.filters.sort = val; navigate('home'); }
function doSearch() {
  const v = document.getElementById('globalSearch').value.trim();
  state.filters.search = v;
  state.filters.page = 1;
  navigate('home');
}
function goPage(n) { state.filters.page = n; navigate('home'); window.scrollTo(0,0); }

// ── Product detail ─────────────────────────────
async function renderProduct(id) {
  const { product: p, related } = await api('GET', `/api/products/${id}`);
  state.currentProduct = p;
  const stars = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5-Math.round(p.rating));
  const stockLabel = p.stock === 0
    ? `<span class="stock-out">Out of stock</span>`
    : p.stock < 10
    ? `<span class="stock-low">Only ${p.stock} left</span>`
    : `<span class="stock-ok">✓ In stock</span>`;

  document.getElementById('app').innerHTML = `
    <nav class="breadcrumb">
      <a onclick="navigate('home')">Shop</a><span>/</span>
      <a onclick="setCategory('${p.category}')">${p.category}</a><span>/</span>
      <span>${p.name}</span>
    </nav>
    <div class="detail-layout">
      <div class="detail-img-wrap">
        <img class="detail-img" src="${p.image}" alt="${p.name}"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/fallback${p.id}/600/600'" />
      </div>
      <div class="detail-info">
        <div class="detail-category">${p.category}</div>
        <h1>${p.name}</h1>
        <div class="product-rating">
          <span class="stars" style="font-size:1.1rem">${stars}</span>
          <span class="rating-text" style="font-size:.9rem">${p.rating} · ${p.reviews} reviews</span>
        </div>
        <div class="detail-price">₹${p.price.toFixed(2)}</div>
        <p class="detail-desc">${p.description}</p>
        <div class="detail-stock">${stockLabel}</div>
        ${p.stock > 0 ? `
        <div class="qty-row">
          <div class="qty-ctrl">
            <button onclick="changeDetailQty(-1)">−</button>
            <span id="detailQty">1</span>
            <button onclick="changeDetailQty(1)">+</button>
          </div>
          <button class="btn-primary" onclick="detailAddToCart()" style="flex:1">Add to Cart</button>
        </div>
        <button class="btn-amber" onclick="detailBuyNow()" style="width:100%;margin-top:8px">Buy Now</button>
        ` : ''}
      </div>
    </div>
    ${related.length ? `
    <h2 class="section-title">You might also like</h2>
    <div class="related-grid">${related.map(productCardHTML).join('')}</div>
    ` : ''}
  `;
}

let detailQty = 1;
function changeDetailQty(d) {
  const p = state.currentProduct;
  detailQty = Math.max(1, Math.min(p.stock, detailQty + d));
  const el = document.getElementById('detailQty');
  if (el) el.textContent = detailQty;
}
function detailAddToCart() {
  if (state.currentProduct) {
    addToCart(state.currentProduct, detailQty);
    detailQty = 1;
  }
}
function detailBuyNow() {
  detailAddToCart();
  navigate('cart');
}

// ── Cart page ──────────────────────────────────
function renderCart() {
  const cart = state.cart;
  const subtotal = cart.reduce((s,i) => s + i.price * i.quantity, 0);
  const shipping  = subtotal >= 5000 ? 0 : 99; // Updated logic
  const tax       = subtotal * 0.08;
  const total     = subtotal + shipping + tax;

  if (!cart.length) {
    document.getElementById('app').innerHTML = `
      <div class="cart-empty">
        <div style="font-size:4rem;margin-bottom:16px">🛒</div>
        <h2>Your cart is empty</h2>
        <p style="color:var(--slate);margin:12px 0 28px">Start adding some great products.</p>
        <button class="btn-primary" onclick="navigate('home')">Continue Shopping</button>
      </div>`;
    return;
  }

  document.getElementById('app').innerHTML = `
    <h1 style="margin-bottom:28px">Shopping Cart <span style="font-size:1rem;color:var(--slate);font-family:Inter">(${cart.length} item${cart.length!==1?'s':''})</span></h1>
    <div class="cart-layout">
      <div class="cart-items">
        ${cart.map(item => `
          <div class="cart-item">
            <img class="cart-item-img" src="${item.image}" alt="${item.name}"
                 onerror="this.src='https://via.placeholder.com/90x90?text=?'" />
            <div class="cart-item-info">
              <div class="cart-item-name" onclick="navigate('product',{id:${item.id}})">${item.name}</div>
              <div class="cart-item-price">₹${item.price.toFixed(2)} each</div>
              <div class="cart-item-actions">
                <div class="qty-ctrl">
                  <button onclick="updateCartQty(${item.id},-1)">−</button>
                  <span>${item.quantity}</span>
                  <button onclick="updateCartQty(${item.id},1)">+</button>
                </div>
                <strong>₹${(item.price * item.quantity).toFixed(2)}</strong>
                <button class="btn-danger" onclick="removeFromCart(${item.id})">Remove</button>
              </div>
            </div>
          </div>
        `).join('')}
        <button class="btn-ghost" onclick="navigate('home')" style="align-self:flex-start;margin-top:8px">← Continue Shopping</button>
      </div>
      <div class="cart-summary">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--success)">Free</span>' : '₹'+shipping.toFixed(2)}</span></div>
        <div class="summary-row"><span>Tax (8%)</span><span>₹${tax.toFixed(2)}</span></div>
        <div class="summary-row total"><span>Total</span><span>₹${total.toFixed(2)}</span></div>
        ${shipping > 0 ? `<p style="font-size:.8rem;color:var(--amber);margin:12px 0">Add ₹${(5000-subtotal).toFixed(2)} more for free shipping</p>` : ''}
        <button class="btn-primary full" style="margin-top:20px" onclick="goCheckout()">Proceed to Checkout</button>
      </div>
    </div>`;
}

function goCheckout() {
  if (!state.user) { openModal('login'); return; }
  navigate('checkout');
}

// ── Checkout page ──────────────────────────────
function renderCheckout() {
  if (!state.user) { navigate('cart'); return; }
  const cart     = state.cart;
  const subtotal = cart.reduce((s,i) => s + i.price * i.quantity, 0);
  const shipping  = subtotal >= 5000 ? 0 : 99; // Updated logic
  const tax       = subtotal * 0.08;
  const total     = subtotal + shipping + tax;

  document.getElementById('app').innerHTML = `
    <nav class="breadcrumb">
      <a onclick="navigate('cart')">Cart</a><span>/</span><span>Checkout</span>
    </nav>
    <h1 style="margin-bottom:28px">Checkout</h1>
    <div class="checkout-grid">
      <div>
        <div class="checkout-form">
          <h3>Shipping Address</h3>
          <div class="form-row">
            <div class="form-group"><label>First Name</label><input id="shpFirst" placeholder="Jane" /></div>
            <div class="form-group"><label>Last Name</label><input id="shpLast" placeholder="Doe" /></div>
          </div>
          <div class="form-group"><label>Street Address</label><input id="shpStreet" placeholder="123 Main St" /></div>
          <div class="form-row">
            <div class="form-group"><label>City</label><input id="shpCity" placeholder="San Francisco" /></div>
            <div class="form-group"><label>State</label><input id="shpState" placeholder="CA" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>ZIP Code</label><input id="shpZip" placeholder="94105" /></div>
            <div class="form-group"><label>Country</label>
              <select id="shpCountry"><option>United States</option><option>Canada</option><option>United Kingdom</option><option>India</option></select>
            </div>
          </div>
          <div id="checkoutError" class="form-error" style="margin-bottom:12px"></div>
        </div>

        <div class="checkout-form" style="margin-top:20px">
          <h3>Payment Method</h3>
          <p style="color:var(--slate);font-size:.9rem;background:var(--amber-light);border-radius:8px;padding:12px 16px;margin-bottom:20px">
            🔒 Demo store — no real payment is processed.
          </p>

          <div class="payment-methods">

            <label class="payment-option" onclick="selectPayment('gpay')">
              <input type="radio" name="payment" value="gpay" id="pay_gpay" checked />
              <div class="payment-card" id="pcard_gpay">
                <svg viewBox="0 0 512 200" class="pay-icon"><text y="160" font-size="160" font-family="Arial,sans-serif" font-weight="700"><tspan fill="#4285F4">G</tspan><tspan fill="#EA4335">o</tspan><tspan fill="#FBBC05">o</tspan><tspan fill="#4285F4">g</tspan><tspan fill="#34A853">l</tspan><tspan fill="#EA4335">e</tspan></text><tspan fill="#5F6368" font-size="110" font-family="Arial,sans-serif" font-weight="700"> Pay</tspan></svg>
                <span>Google Pay</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('phonepe')">
              <input type="radio" name="payment" value="phonepe" id="pay_phonepe" />
              <div class="payment-card" id="pcard_phonepe">
                <svg viewBox="0 0 64 64" class="pay-icon"><rect width="64" height="64" rx="12" fill="#5f259f"/><path d="M18 12h16c8.8 0 14 5.2 14 13 0 8-5.2 13-14 13H26v14h-8V12zm8 7v12h8c3.6 0 6-2.2 6-6s-2.4-6-6-6h-8z" fill="white"/></svg>
                <span>PhonePe</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('paytm')">
              <input type="radio" name="payment" value="paytm" id="pay_paytm" />
              <div class="payment-card" id="pcard_paytm">
                <svg viewBox="0 0 120 40" class="pay-icon"><rect width="120" height="40" rx="6" fill="#002970"/><text x="8" y="28" font-size="22" font-family="Arial,sans-serif" font-weight="900" fill="#00BAF2">Pay</text><text x="52" y="28" font-size="22" font-family="Arial,sans-serif" font-weight="900" fill="white">tm</text></svg>
                <span>Paytm</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('upi')">
              <input type="radio" name="payment" value="upi" id="pay_upi" />
              <div class="payment-card" id="pcard_upi">
                <svg viewBox="0 0 120 48" class="pay-icon"><rect width="120" height="48" rx="6" fill="white"/><text x="6" y="34" font-size="30" font-family="Arial,sans-serif" font-weight="900"><tspan fill="#097939">U</tspan><tspan fill="#ed752e">P</tspan><tspan fill="#097939">I</tspan></text><rect x="52" y="8" width="3" height="32" fill="#bbb"/><text x="60" y="22" font-size="11" font-family="Arial,sans-serif" fill="#555" font-weight="600">Unified</text><text x="60" y="36" font-size="11" font-family="Arial,sans-serif" fill="#555" font-weight="600">Payments</text></svg>
                <span>Other UPI</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('amazonpay')">
              <input type="radio" name="payment" value="amazonpay" id="pay_amazonpay" />
              <div class="payment-card" id="pcard_amazonpay">
                <svg viewBox="0 0 120 48" class="pay-icon"><rect width="120" height="48" rx="6" fill="#232f3e"/><text x="10" y="30" font-size="18" font-family="Arial,sans-serif" font-weight="700" fill="white">amazon</text><text x="10" y="44" font-size="12" font-family="Arial,sans-serif" font-weight="600" fill="#ff9900">pay</text><path d="M72 34 Q90 42 108 34" stroke="#ff9900" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>
                <span>Amazon Pay</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('mobikwik')">
              <input type="radio" name="payment" value="mobikwik" id="pay_mobikwik" />
              <div class="payment-card" id="pcard_mobikwik">
                <svg viewBox="0 0 120 48" class="pay-icon"><rect width="120" height="48" rx="6" fill="#29235c"/><text x="8" y="32" font-size="19" font-family="Arial,sans-serif" font-weight="900" fill="white">Mobi</text><text x="58" y="32" font-size="19" font-family="Arial,sans-serif" font-weight="900" fill="#f05a28">Kwik</text></svg>
                <span>MobiKwik</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('card')">
              <input type="radio" name="payment" value="card" id="pay_card" />
              <div class="payment-card" id="pcard_card">
                <svg viewBox="0 0 48 48" class="pay-icon"><rect width="48" height="32" rx="5" y="8" fill="#1a1a2e"/><rect y="16" width="48" height="8" fill="#e94560"/><rect x="4" y="28" width="10" height="6" rx="2" fill="#ffd700"/><circle cx="38" cy="31" r="4" fill="#eb5757" opacity=".8"/><circle cx="44" cy="31" r="4" fill="#f4a261" opacity=".8"/></svg>
                <span>Card</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('netbanking')">
              <input type="radio" name="payment" value="netbanking" id="pay_netbanking" />
              <div class="payment-card" id="pcard_netbanking">
                <svg viewBox="0 0 48 48" class="pay-icon"><rect width="48" height="48" rx="6" fill="#0f4c81"/><rect x="4" y="18" width="40" height="4" fill="white" opacity=".3"/><rect x="6" y="8" width="36" height="6" rx="2" fill="white"/><rect x="6" y="26" width="8" height="14" rx="2" fill="white" opacity=".9"/><rect x="20" y="26" width="8" height="14" rx="2" fill="white" opacity=".9"/><rect x="34" y="26" width="8" height="14" rx="2" fill="white" opacity=".9"/></svg>
                <span>Net Banking</span>
              </div>
            </label>

            <label class="payment-option" onclick="selectPayment('cod')">
              <input type="radio" name="payment" value="cod" id="pay_cod" />
              <div class="payment-card" id="pcard_cod">
                <svg viewBox="0 0 48 48" class="pay-icon"><rect width="48" height="30" rx="4" y="9" fill="#2e7d32"/><rect x="4" y="14" width="40" height="20" rx="3" fill="#43a047"/><circle cx="24" cy="24" r="7" fill="#1b5e20"/><text x="24" y="28" text-anchor="middle" font-size="10" font-weight="900" fill="#fdd835" font-family="Arial">₹</text></svg>
                <span>Cash on Delivery</span>
              </div>
            </label>

          </div>

          <!-- Info panel shown below icons -->
          <div id="payment_info" style="margin-top:16px;padding:12px 16px;background:var(--stone);border-radius:8px;font-size:.88rem;color:var(--slate);display:flex;align-items:center;gap:10px">
            <span id="payment_info_icon" style="font-size:1.3rem">📲</span>
            <span id="payment_info_text">Open Google Pay on your phone and scan / pay to complete your order.</span>
          </div>
        </div>
      </div>

      <div class="cart-summary">
        <h3>Order Items</h3>
        ${cart.map(i => `
          <div class="summary-row">
            <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.name} ×${i.quantity}</span>
            <span>₹${(i.price * i.quantity).toFixed(2)}</span>
          </div>`).join('')}
        <div style="border-top:1px solid var(--mist);margin-top:8px;padding-top:8px">
          <div class="summary-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${shipping===0?'Free':'₹'+shipping.toFixed(2)}</span></div>
          <div class="summary-row"><span>Tax</span><span>₹${tax.toFixed(2)}</span></div>
          <div class="summary-row total"><span>Total</span><span>₹${total.toFixed(2)}</span></div>
        </div>
        <button class="btn-amber full" style="margin-top:20px" onclick="placeOrder()">Place Order →</button>
      </div>
    </div>`;
  // default-select GPay
  selectPayment('gpay');
}

const paymentInfo = {
  gpay:       { icon: '📲', text: 'Open Google Pay on your phone and complete the payment.' },
  phonepe:    { icon: '📱', text: 'Open PhonePe on your phone and complete the payment.' },
  paytm:      { icon: '💼', text: 'Open Paytm on your phone and complete the payment.' },
  upi:        { icon: '🔗', text: 'Use any UPI app — enter ShopWave@upi as the recipient.' },
  amazonpay:  { icon: '🛒', text: 'Open Amazon Pay on your phone and complete the payment.' },
  mobikwik:   { icon: '👛', text: 'Open MobiKwik on your phone and complete the payment.' },
  card:       { icon: '💳', text: 'Pay securely with your Credit or Debit card.' },
  netbanking: { icon: '🏦', text: 'Pay directly from your bank account via Net Banking.' },
  cod:        { icon: '💵', text: 'Pay in cash when your order arrives. No extra charges.' },
};

function selectPayment(method) {
  document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('active'));
  const active = document.getElementById('pcard_' + method);
  if (active) active.classList.add('active');
  const info = paymentInfo[method] || {};
  document.getElementById('payment_info_icon').textContent = info.icon || '💳';
  document.getElementById('payment_info_text').textContent = info.text || '';
}

async function placeOrder() {
  const street  = document.getElementById('shpStreet')?.value.trim();
  const city    = document.getElementById('shpCity')?.value.trim();
  const state_  = document.getElementById('shpState')?.value.trim();
  const zip     = document.getElementById('shpZip')?.value.trim();
  const country = document.getElementById('shpCountry')?.value;
  const first   = document.getElementById('shpFirst')?.value.trim();
  const last    = document.getElementById('shpLast')?.value.trim();
  const errEl   = document.getElementById('checkoutError');

  if (!street || !city || !state_ || !zip || !first || !last) {
    errEl.textContent = 'Please fill in all shipping fields.'; return;
  }

  const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value || 'gpay';

  try {
    const { orderId } = await api('POST', '/api/orders', {
      items: state.cart.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
      address: { name: `${first} ${last}`, street, city, state: state_, zip, country },
      payment_method: selectedPayment
    });
    state.cart = [];
    saveCart();
    renderCartBadge();
    showToast('Order placed successfully!', 'success');
    navigate('order', { id: orderId });
  } catch(e) {
    errEl.textContent = e.message;
  }
}

// ── Cancel order ───────────────────────────────
async function cancelOrder(id) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  try {
    await api('POST', `/api/orders/${id}/cancel`);
    showToast('Order cancelled', 'success');
    navigate('order', { id });
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Orders list ────────────────────────────────
async function renderOrders() {
  if (!state.user) { openModal('login'); navigate('home'); return; }
  const { orders } = await api('GET', '/api/orders');
  const app = document.getElementById('app');

  if (!orders.length) {
    app.innerHTML = `
      <h1 style="margin-bottom:28px">My Orders</h1>
      <div class="empty-state"><div class="icon">📦</div>
        <h3>No orders yet</h3><p>Your completed orders will appear here.</p>
        <button class="btn-primary" onclick="navigate('home')">Start Shopping</button></div>`;
    return;
  }

  app.innerHTML = `
    <h1 style="margin-bottom:28px">My Orders</h1>
    <div class="orders-list">
      ${orders.map(o => `
        <div class="order-card" onclick="navigate('order',{id:${o.id}})" style="cursor:pointer">
          <div class="order-meta">
            <div class="order-id">Order #${o.id}</div>
            <div class="order-date">${new Date(o.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
            <div class="order-items-list">${o.items_summary || 'No items'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:20px">
            <span class="order-status status-${o.status}">${o.status}</span>
            <span class="order-total">₹${parseFloat(o.total).toFixed(2)}</span>
            ${!['delivered','cancelled'].includes(o.status) ? `<button class="btn-secondary" style="color:#D14343;border-color:#D14343" onclick="event.stopPropagation();cancelOrder(${o.id})">Cancel</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── Order detail ───────────────────────────────
async function renderOrderDetail(id) {
  if (!state.user) { navigate('home'); return; }
  const { order } = await api('GET', `/api/orders/${id}`);
  const app = document.getElementById('app');

  const isCOD = order.payment_method === 'cod';

  const stages = [
    { key: 'confirmed',  label: 'Order Confirmed', icon: '✅', desc: 'We have received your order' },
    { key: 'processing', label: 'Processing',      icon: '📦', desc: 'Your items are being packed' },
    { key: 'shipped',    label: 'Shipped',          icon: '🚚', desc: 'Order is on its way to you' },
    { key: 'delivered',  label: 'Delivered',        icon: '🏠', desc: isCOD ? 'Delivered — please pay the delivery partner' : 'Delivered to your address' },
  ];
  const stageOrder = ['confirmed','processing','shipped','delivered'];
  const isCancelled = order.status === 'cancelled';
  const currentIdx = isCancelled ? stageOrder.length : stageOrder.indexOf(order.status);

  const cancelledBanner = isCancelled ? `
    <div class="cod-banner" style="background:#FDEDED;border-color:#D14343">
      <span style="font-size:2rem">🚫</span>
      <div>
        <strong style="color:#D14343">Order Cancelled</strong>
        <p>This order has been cancelled${isCOD ? '' : ' and any payment will be refunded'}.</p>
      </div>
    </div>` : '';

  const timelineHTML = stages.map((s, i) => {
    const done   = i <= currentIdx;
    const active = i === currentIdx;
    const event  = (order.tracking || []).find(t => t.status === s.key);
    return `
      <div class="track-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
        <div class="track-icon-wrap">
          <div class="track-icon">${done ? s.icon : '○'}</div>
          ${i < stages.length - 1 ? '<div class="track-line"></div>' : ''}
        </div>
        <div class="track-info">
          <div class="track-label">${s.label}</div>
          <div class="track-desc">${event ? event.message : s.desc}</div>
          ${event ? `<div class="track-time">${new Date(event.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const paymentBadge = isCOD
    ? `<span class="payment-badge cod">💵 Cash on Delivery</span>`
    : `<span class="payment-badge online">✅ Paid Online</span>`;

  const codBanner = isCOD && order.status !== 'delivered' ? `
    <div class="cod-banner">
      <span style="font-size:2rem">💵</span>
      <div>
        <strong>Cash on Delivery Order</strong>
        <p>Please keep <strong>₹${parseFloat(order.total).toFixed(2)}</strong> ready to pay the delivery partner when your order arrives.</p>
      </div>
    </div>` : '';

  const deliveredCODBanner = isCOD && order.status === 'delivered' ? `
    <div class="cod-banner delivered">
      <span style="font-size:2rem">🎉</span>
      <div>
        <strong>Order Delivered!</strong>
        <p>Hope you paid ₹${parseFloat(order.total).toFixed(2)} to the delivery partner. Enjoy your purchase!</p>
      </div>
    </div>` : '';

  app.innerHTML = `
    <nav class="breadcrumb">
      <a onclick="navigate('orders')">My Orders</a><span>/</span><span>Order #${order.id}</span>
    </nav>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap">
      <h1>Order #${order.id}</h1>
      <span class="order-status status-${order.status}">${order.status}</span>
      ${paymentBadge}
    </div>
    <p style="color:var(--slate);font-size:.85rem;margin-bottom:24px">
      Placed on ${new Date(order.created_at).toLocaleDateString('en-IN',{dateStyle:'long'})}
    </p>

    ${cancelledBanner}${codBanner}${deliveredCODBanner}

    <div class="order-detail-grid">
      <div>
        <div class="order-detail-items" style="margin-bottom:20px">
          <h3 style="margin-bottom:24px">📍 Order Tracking</h3>
          <div class="tracking-timeline">${timelineHTML}</div>
        </div>

        <div class="order-detail-items">
          <h3 style="margin-bottom:16px">Items Ordered</h3>
          ${order.items.map(i => `
            <div class="order-item-row">
              <img class="order-item-img" src="${i.image}" alt="${i.name}"
                   onerror="this.onerror=null;this.src='https://picsum.photos/seed/fallback/60/60'" />
              <div style="flex:1">
                <div style="font-weight:500">${i.name}</div>
                <div style="color:var(--slate);font-size:.85rem">Qty: ${i.quantity} × ₹${parseFloat(i.price).toFixed(2)}</div>
              </div>
              <div style="font-weight:600">₹${(i.price * i.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;padding-top:16px;border-top:2px solid var(--mist)">
            <span>Total</span><span>₹${parseFloat(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="order-info-panel">
        <h4>Shipping Address</h4>
        <p style="color:var(--slate);font-size:.9rem;margin-bottom:20px;line-height:1.8">
          ${order.address.name}<br>
          ${order.address.street}<br>
          ${order.address.city}, ${order.address.state} ${order.address.zip}<br>
          ${order.address.country}
        </p>
        <h4>Order Info</h4>
        <div class="info-row"><span>Order Date</span><span>${new Date(order.created_at).toLocaleDateString('en-IN')}</span></div>
        <div class="info-row"><span>Status</span><span style="text-transform:capitalize">${order.status}</span></div>
        <div class="info-row"><span>Payment</span><span>${isCOD ? '💵 Cash on Delivery' : '✅ Paid Online'}</span></div>
        <div class="info-row"><span>Total</span><span>₹${parseFloat(order.total).toFixed(2)}</span></div>
        ${!['delivered','cancelled'].includes(order.status) ? `<button class="btn-secondary full" style="margin-top:24px;color:#D14343;border-color:#D14343" onclick="cancelOrder(${order.id})">Cancel Order</button>` : ''}
        <button class="btn-primary full" style="margin-top:10px" onclick="navigate('home')">Continue Shopping</button>
        <button class="btn-secondary full" style="margin-top:10px" onclick="navigate('orders')">All Orders</button>
      </div>
    </div>`;
}