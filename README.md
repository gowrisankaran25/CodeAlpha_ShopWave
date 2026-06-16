# 🛍 ShopWave — E-Commerce Store

A full-featured e-commerce application built with **Express.js**, **SQLite**, and a vanilla JS SPA frontend.

---

## Features

| Feature | Details |
|---|---|
| **Product Listings** | Grid with filters, category chips, sort, search, pagination |
| **Product Detail** | Image, description, stock indicator, quantity selector, related products |
| **Shopping Cart** | Persistent (localStorage), quantity controls, order summary, free-shipping threshold |

| **Checkout** | Shipping form, order review, multiple payment methods (UPI apps, card, net banking, Cash on Delivery) |
| **Order Processing** | Creates DB records, reduces stock, shows order confirmation |
| **Order Tracking** | Simulated status timeline (Confirmed → Processing → Shipped → Delivered) with timestamped events |
| **Order Cancellation** | Cancel an order before it's delivered; restores product stock automatically |
| **User Auth** | Register, login, logout, session-based |
| **My Orders** | Full order history with status, item breakdown, quick cancel |
| **Order Detail** | Line items, shipping address, tracking timeline, payment method, cancel action |
| **SQLite Database** | Users, Products, Orders, Order Items, Order Tracking — auto-seeded with 30 products |

| **Checkout** | Shipping form, order review, demo payment |
| **Order Processing** | Creates DB records, reduces stock, shows order confirmation |
| **User Auth** | Register, login, logout, session-based |
| **My Orders** | Full order history with status, item breakdown |
| **Order Detail** | Line items, shipping address, order status |
| **SQLite Database** | Users, Products, Orders, Order Items — auto-seeded with 12 products |


---

## Quick Start

### Prerequisites
- Node.js 18+ installed

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js

# 3. Open in your browser
open http://localhost:3000
```


The database (`ecommerce.db`) is created automatically on first run and seeded with 30 sample products. Product images are loaded dynamically from [LoremFlickr](https://loremflickr.com/) based on a keyword per product.

The database (`ecommerce.db`) is created automatically on first run and seeded with 12 sample products.


---

## Project Structure

```
ecommerce/
├── server.js              # Express backend — all API routes
├── ecommerce.db           # SQLite database (auto-created)
├── package.json
└── public/
    ├── index.html         # SPA shell + auth modals
    ├── css/
    │   └── style.css      # Full design system
    └── js/
        └── app.js         # SPA router + all page rendering
```

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `GET`  | `/api/auth/me` | Current session |

### Products
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/products` | List with `?category=&sort=&search=&page=&limit=` |
| `GET` | `/api/products/categories` | All distinct categories |
| `GET` | `/api/products/:id` | Single product + related |

### Orders *(requires login)*
| Method | Route | Description |
|---|---|---|

| `POST` | `/api/orders` | Place order (accepts `payment_method`: online methods or `cod`) |
| `GET`  | `/api/orders` | My order history |
| `GET`  | `/api/orders/:id` | Order detail, including tracking timeline and live status |
| `POST` | `/api/orders/:id/cancel` | Cancel an order (blocked if already `delivered` or `cancelled`); restores stock |

| `POST` | `/api/orders` | Place order |
| `GET`  | `/api/orders` | My order history |
| `GET`  | `/api/orders/:id` | Order detail |


---

## Security Notes

- Passwords are SHA-256 hashed (upgrade to bcrypt in production)

- Sessions use a default secret (`shopwave-dev-secret`) — set the `SESSION_SECRET` env var in production
- Session cookies are not marked `secure` by default — enable this and use HTTPS in production

- Sessions use a hardcoded secret — set `SESSION_SECRET` env var in production
- Use HTTPS in production


---

## Tech Stack
- **Backend**: Node.js, Express 4, [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly), express-session
- **Frontend**: Vanilla HTML/CSS/JS (no framework), Instrument Serif + Inter fonts
- **Database**: SQLite via sql.js — in-memory with the full DB persisted to `ecommerce.db` on every write
- **Tables**: `users`, `products`, `orders`, `order_items`, `order_tracking`

- **Backend**: Node.js, Express 4, better-sqlite3, express-session
- **Frontend**: Vanilla HTML/CSS/JS (no framework), Instrument Serif + Inter fonts
- **Database**: SQLite (file-based, zero-config)

