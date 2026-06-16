
// server.js  – Full E-Commerce Backend (Express + sql.js)
// Run: npm install && node server.js


const express  = require('express');
const session  = require('express-session');
const crypto   = require('crypto');
const path     = require('path');
const fs       = require('fs');
const initSqlJs = require('sql.js');

// ── App setup (boot async so DB is ready first) ───────────────
async function startServer() {

const SQL = await initSqlJs();
const DB_PATH = path.join(__dirname, 'ecommerce.db');

// Load existing DB from disk or create fresh
let db;
if (fs.existsSync(DB_PATH)) {
  const fileBuffer = fs.readFileSync(DB_PATH);
  db = new SQL.Database(fileBuffer);
} else {
  db = new SQL.Database();
}

// Persist DB to disk after every write
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper wrappers to mimic better-sqlite3 API
function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function runGetId(sql, params = []) {
  db.run(sql, params);
  const row = get('SELECT last_insert_rowid() as id');
  persist();
  return row.id;
}

// ── Schema ────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL NOT NULL,
    category    TEXT,
    image       TEXT,
    stock       INTEGER DEFAULT 0,
    rating      REAL DEFAULT 4.0,
    reviews     INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER,
    total          REAL NOT NULL,
    status         TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'online',
    address        TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER,
    product_id INTEGER,
    quantity   INTEGER,
    price      REAL
  );
  CREATE TABLE IF NOT EXISTS order_tracking (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER,
    status     TEXT NOT NULL,
    message    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);
// Add columns if upgrading existing DB
try { db.run(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'online'`); } catch(e) {}

// ── Seed products (Prices updated to Indian Rupees INR) ───────
const seedCount = get('SELECT COUNT(*) as c FROM products').c;
const stalePicsum = get("SELECT COUNT(*) as c FROM products WHERE image LIKE '%picsum%'").c;
if (!seedCount || seedCount < 30 || stalePicsum > 0) {
  db.run('DELETE FROM products');
  const products = [
    [1,'Wireless Noise-Cancelling Headphones','Premium over-ear headphones with 40-hour battery life and active noise cancellation.',16499.00,'Electronics','https://loremflickr.com/400/400/headphones',45,4.8,312],
    [2,'Mechanical Keyboard','Compact TKL keyboard with Cherry MX switches and RGB backlight.',9999.00,'Electronics','https://loremflickr.com/400/400/keyboard',30,4.6,184],
    [3,'Minimalist Watch','Japanese quartz movement, sapphire crystal glass, leather strap.',19999.00,'Accessories','https://loremflickr.com/400/400/watch',20,4.7,256],
    [4,'Running Shoes','Lightweight mesh upper with responsive foam sole, available in 6 colors.',6999.00,'Footwear','https://loremflickr.com/400/400/sneakers',80,4.5,428],
    [5,'Leather Backpack','Full-grain leather, 20L capacity, padded laptop sleeve.',12999.00,'Bags','https://loremflickr.com/400/400/backpack',15,4.9,97],
    [6,'Ceramic Coffee Mug','Hand-thrown stoneware, 12oz, microwave & dishwasher safe.',1499.00,'Kitchen','https://loremflickr.com/400/400/mug',100,4.4,203],
    [7,'Yoga Mat','6mm thick eco-friendly TPE, non-slip surface, includes strap.',2499.00,'Sports','https://loremflickr.com/400/400/yoga',60,4.6,315],
    [8,'Sunglasses','Polarised UV400 lenses, lightweight titanium frame.',8999.00,'Accessories','https://loremflickr.com/400/400/sunglasses',35,4.5,178],
    [9,'Plant-Based Protein Powder','25g protein per serving, vanilla flavour, 30 servings.',3999.00,'Health','https://loremflickr.com/400/400/protein',50,4.3,542],
    [10,'Desk Lamp','LED, 5 colour temperatures, USB-C charging port on base.',4999.00,'Home','https://loremflickr.com/400/400/lamp',40,4.7,231],
    [11,'Wireless Charger','15W fast-charging pad, compatible with all Qi devices.',1999.00,'Electronics','https://loremflickr.com/400/400/charger',75,4.4,389],
    [12,'Hardcover Notebook','A5 dotted pages, lay-flat binding, 192 pages.',999.00,'Stationery','https://loremflickr.com/400/400/notebook',120,4.8,167],
    [13,'Smart Water Bottle','500ml insulated stainless steel bottle with hydration reminder LED ring.',2299.00,'Sports','https://loremflickr.com/400/400/bottle',55,4.5,211],
    [14,'Wireless Earbuds','True wireless earbuds with 6-hour playtime and 24-hour charging case.',5999.00,'Electronics','https://loremflickr.com/400/400/earbuds',60,4.6,438],
    [15,'Scented Candle Set','Set of 4 hand-poured soy wax candles in calming fragrances, 40hr burn time each.',2799.00,'Home','https://loremflickr.com/400/400/candle',80,4.7,129],
    [16,'Cotton Kurta','Handloom cotton with block print, relaxed fit, sizes S–XXL.',1799.00,'Clothing','https://loremflickr.com/400/400/kurta',90,4.4,302],
    [17,'Laptop Stand','Aluminium adjustable riser, foldable, fits 10–17 inch laptops.',3499.00,'Electronics','https://loremflickr.com/400/400/laptop',40,4.7,185],
    [18,'Face Serum','Vitamin C brightening serum with hyaluronic acid, 30ml.',1899.00,'Beauty','https://loremflickr.com/400/400/skincare',70,4.5,367],
    [19,'Wooden Chess Set','Hand-carved rosewood board with weighted pieces, foldable storage.',4599.00,'Games','https://loremflickr.com/400/400/chess',25,4.8,94],
    [20,'Air Purifier','True HEPA H13 filter, covers 350 sq ft, whisper-quiet night mode.',11999.00,'Home','https://loremflickr.com/400/400/purifier',20,4.6,218],
    [21,'Tote Bag','Organic cotton canvas, 15L capacity, inner zip pocket, reinforced handles.',899.00,'Bags','https://loremflickr.com/400/400/tote',150,4.3,276],
    [22,'Resistance Bands Set','Set of 5 fabric loop bands with varying resistance levels and carry pouch.',1299.00,'Sports','https://loremflickr.com/400/400/fitness',85,4.5,341],
    [23,'Copper Water Jug','Handcrafted pure copper jug with lid, 1.5 litres, leakproof.',1599.00,'Kitchen','https://loremflickr.com/400/400/jug',60,4.6,157],
    [24,'Noise-Cancelling Earphones','Over-ear wired earphones with active noise cancellation and in-line mic.',3799.00,'Electronics','https://loremflickr.com/400/400/earphones',35,4.4,223],
    [25,'Sketch & Watercolor Kit','24 watercolors, 12 sketch pencils, brush pen set in a zipper case.',2199.00,'Stationery','https://loremflickr.com/400/400/watercolor',45,4.7,98],
    [26,'Portable Blender','USB rechargeable 350ml personal blender for smoothies and protein shakes.',2499.00,'Kitchen','https://loremflickr.com/400/400/blender',50,4.4,184],
    [27,'Silk Sleep Mask','100% mulberry silk eye mask with adjustable strap, blocks 100% light.',999.00,'Beauty','https://loremflickr.com/400/400/eyemask',100,4.5,213],
    [28,'Plant Pot Set','Set of 3 terracotta pots with drainage holes and saucers, hand-painted.',1399.00,'Home','https://loremflickr.com/400/400/plant',70,4.6,142],
    [29,'Foam Roller','High-density EVA foam roller 60cm, for deep tissue muscle recovery.',1899.00,'Sports','https://loremflickr.com/400/400/foam',55,4.5,267],
    [30,'Bamboo Desk Organiser','Eco-friendly 5-compartment desk tidy with pen holder and phone slot.',1299.00,'Stationery','https://loremflickr.com/400/400/desk',65,4.6,119],
  ];
  products.forEach(p => run(
    `INSERT INTO products (id,name,description,price,category,image,stock,rating,reviews) VALUES (?,?,?,?,?,?,?,?,?)`,
    p
  ));
  console.log('✓ Database seeded with 30 products (INR prices)');
}

// ── Express ───────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'shopwave-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── Helpers ───────────────────────────────────────────────────
const hashPw = pw => crypto.createHash('sha256').update(pw + 'salt-ecom').digest('hex');
const requireAuth = (req, res, next) =>
  req.session.userId ? next() : res.status(401).json({ error: 'Not authenticated' });

// ── Auth ──────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const id = runGetId(
      'INSERT INTO users (name, email, password) VALUES (?,?,?)',
      [name, email.toLowerCase(), hashPw(password)]
    );
    req.session.userId = id;
    req.session.userName = name;
    res.json({ success: true, user: { id, name, email } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = get('SELECT * FROM users WHERE email = ?', [email?.toLowerCase()]);
  if (!user || user.password !== hashPw(password))
    return res.status(401).json({ error: 'Invalid email or password' });
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.session.userId]);
  res.json({ user: user || null });
});

// ── Products ──────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, search, sort, page = 1, limit = 12 } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (category && category !== 'All') { where += ' AND category = ?'; params.push(category); }
  if (search) { where += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const orderMap = { price_asc:'price ASC', price_desc:'price DESC', rating:'rating DESC', newest:'id DESC' };
  const orderBy = orderMap[sort] || 'id ASC';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const products = all(`SELECT * FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
  const countRow = get(`SELECT COUNT(*) as total FROM products ${where}`, params);
  const total = countRow ? countRow.total : 0;
  res.json({ products, total, pages: Math.ceil(total / parseInt(limit)) });
});

app.get('/api/products/categories', (req, res) => {
  const rows = all('SELECT DISTINCT category FROM products ORDER BY category');
  res.json(['All', ...rows.map(r => r.category)]);
});

app.get('/api/products/:id', (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const related = all('SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4', [product.category, product.id]);
  res.json({ product, related });
});

// ── Orders ────────────────────────────────────────────────────
app.post('/api/orders', requireAuth, (req, res) => {
  const { items, address, payment_method = 'online' } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'No items in order' });
  if (!address?.street) return res.status(400).json({ error: 'Shipping address required' });

  const isCOD = payment_method === 'cod';
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const initialStatus = isCOD ? 'confirmed' : 'confirmed';

  const orderId = runGetId(
    'INSERT INTO orders (user_id, total, status, payment_method, address) VALUES (?,?,?,?,?)',
    [req.session.userId, total, initialStatus, payment_method, JSON.stringify(address)]
  );
  items.forEach(item => run(
    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)',
    [orderId, item.id, item.quantity, item.price]
  ));
  items.forEach(item => run(
    'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?',
    [item.quantity, item.id]
  ));

  // Seed initial tracking events
  const now = new Date();
  const fmt = (d) => d.toISOString().replace('T',' ').slice(0,19);

  run('INSERT INTO order_tracking (order_id, status, message, created_at) VALUES (?,?,?,?)',
    [orderId, 'confirmed', 'Order placed successfully. ' + (isCOD ? 'Pay cash on delivery.' : 'Payment received.'), fmt(now)]);

  // Simulate future tracking events (auto-progress)
  const t1 = new Date(now.getTime() + 2*60*60*1000);
  run('INSERT INTO order_tracking (order_id, status, message, created_at) VALUES (?,?,?,?)',
    [orderId, 'processing', 'Your order is being packed at our warehouse.', fmt(t1)]);

  const t2 = new Date(now.getTime() + 24*60*60*1000);
  run('INSERT INTO order_tracking (order_id, status, message, created_at) VALUES (?,?,?,?)',
    [orderId, 'shipped', 'Order handed over to courier. Estimated delivery: 3–5 days.', fmt(t2)]);

  // Update order status to processing immediately (simulate)
  run('UPDATE orders SET status = ? WHERE id = ?', ['processing', orderId]);

  res.json({ success: true, orderId, payment_method });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = all(`
    SELECT o.id, o.total, o.status, o.created_at,
      GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ') as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [req.session.userId]);
  res.json({ orders });
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = all(`
    SELECT oi.quantity, oi.price, p.name, p.image
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [order.id]);
  const tracking = all(
    'SELECT status, message, created_at FROM order_tracking WHERE order_id = ? ORDER BY created_at ASC',
    [order.id]
  );
  let address = {};
  try { address = JSON.parse(order.address || '{}'); } catch(e) {}

  // Compute current live status based on time elapsed
  const created = new Date(order.created_at);
  const hoursElapsed = (Date.now() - created.getTime()) / 3600000;
  let liveStatus = order.status;
  if (order.status === 'cancelled') {
    liveStatus = 'cancelled';
  } else if (hoursElapsed >= 96)       liveStatus = 'delivered';
  else if (hoursElapsed >= 24)  liveStatus = 'shipped';
  else if (hoursElapsed >= 2)   liveStatus = 'processing';
  else                          liveStatus = 'confirmed';

  if (liveStatus !== order.status) {
    run('UPDATE orders SET status = ? WHERE id = ?', [liveStatus, order.id]);
  }

  res.json({ order: { ...order, status: liveStatus, address, items, tracking, payment_method: order.payment_method || 'online' } });
});

app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (['delivered', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ error: `Order cannot be cancelled (status: ${order.status})` });
  }

  const items = all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
  items.forEach(item => run(
    'UPDATE products SET stock = stock + ? WHERE id = ?',
    [item.quantity, item.product_id]
  ));

  run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', order.id]);
  run('INSERT INTO order_tracking (order_id, status, message) VALUES (?,?,?)',
    [order.id, 'cancelled', 'Order was cancelled by the customer.']);

  res.json({ success: true });
});

// ── SPA fallback ───────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🛍  ShopWave running → http://localhost:${PORT}\n`));

} // end startServer

startServer().catch(console.error);