# Project Documentation & Decision Log

## Overview
This document serves as a continuous log of conversations, requirements, architectural decisions, and major technical milestones for the development of our custom Frappe application.

## 1. Initial Requirements & Setup (August 17, 2026)

### Environment
- **Current Site**: `newgoldmfg.com` (Set as default)
- **Installed Apps on Site**: 
  - `frappe` (version-15)
  - `erpnext` (version-15)
  - `india_compliance` (version-15)
- **Target App**: We are building a simple, customized app to handle specific inventory and sales logic.

### Document Breakdown (new (1).xlsx)
The initial requirements are based on an Excel file detailing a lightweight inventory and sales management system.
- **Item Master**: Product catalog categorizing items by material (Glass, Plastic, Steel) and type. Includes items like Cups, Bowls, and Plates.
- **Customer & Supplier Masters**: Registries for customers and vendors.
- **Stock Management**: A ledger tracking stock In (Receipts), Out (Deliveries), and Balance.
- **Purchase**: Records incoming stock from suppliers. *Specific requirement*: Need the ability to generate barcodes for individual incoming items.
- **Sell**: Records outgoing stock to customers.
- **Customer and Supplier**: A basic summary ledger showing outstanding amounts or total business volume per entity.

---

## 2. Architecture & Tech Stack (August 18 - 21, 2026)

We made a significant architectural pivot to use a Headless Frappe backend paired with a custom React frontend.

### The React Setup
- **App Wrapper**: The React app is scaffolded inside a custom Frappe app named `goldretail`.
- **Framework**: Built with React and Vite. It lives in the `goldretail/frontend` folder.
- **Frappe React SDK**: We heavily leverage `frappe-react-sdk` to interact with Frappe's APIs without writing redundant Axios wrappers. We utilize hooks like `useFrappeGetDocList`, `useFrappeGetDoc`, `useFrappeGetCall`, and `useFrappePostCall`.

### Build & Serving Strategy
- **Bypassing Frappe's ESBuild**: We encountered issues (`ERR_INVALID_ARG_TYPE`) when trying to use `bench build --app frontend`. We concluded that because `frontend` is a standard Node project (Vite) inside a Frappe app directory, it should **not** be built using Frappe's asset bundler.
- **Vite Build**: Instead, we run standard `npm run build`.
- **Jinja Routing**: The `vite.config.js` is configured to output the built `index.html` file as `frontend.html` directly into `goldretail/www`. Frappe natively serves this file at the `/frontend` route.

### Authentication & CSRF
- Because the React app is served by Frappe's website routing natively (via `www/frontend.html`), it inherits the user's session cookie.
- **CSRF Tokens**: To allow `useFrappePostCall` to save documents (like Sales Invoices) without throwing `frappe.exceptions.CSRFTokenError: Invalid Request`, we injected the CSRF token via Jinja inside `index.html`:
  ```html
  <script>
    window.csrf_token = '{{ frappe.session.csrf_token }}';
  </script>
  ```
  The SDK automatically picks up `window.csrf_token` and authenticates POST/PUT requests seamlessly.

---

## 3. UI/UX Overhaul & Aesthetics

The user requested a premium, highly interactive, and eye-catching UI akin to modern consumer apps like **Swiggy**. We scrapped the 90s-style vibe and basic Vite templates for a completely bespoke Material-UI (MUI) design system.

### Design System Principles
- **Typography**: Adopted **Plus Jakarta Sans**, a premium, bold, geometric sans-serif font.
- **Spacious Forms**: We removed `size="small"` attributes from our forms (`SalesForm.jsx`, `PurchaseForm.jsx`) to uncompress them and provide larger, tappable input targets.
- **Elevated Cards**: Global MUI Theme overrides (`ThemeEngine.js`) to enforce large, modern `24px` border radii and soft, deep-elevation box shadows on hovering.
- **Viewport Fixes**: Stripped out boilerplate Vite CSS (`index.css` and `App.css`) that restricted content width to `1280px`, allowing our dashboard to act fluidly across the entire screen.

### Detail Pages
- Overhauled `SalesDetails.jsx` and `PurchaseDetails.jsx` to feature robust data grids.
- Added a **Document Info** meta-section mapping core Frappe system fields: `owner` (Created By), `creation` (Created On), `modified_by` (Last Modified By), and `modified` (Last Modified On).

---

## 4. Custom Backend Integrations

While standard Frappe APIs (`frappe.client.get_list`) handle our basic CRUD operations, we implemented bespoke Python whitelist functions to support complex frontend requirements.

### Customer Outstanding Report
- **Endpoint**: `goldretail.api.payments.payment_allocator.get_customer_outstanding`
- **Logic**: Aggregates total outstanding values from submitted `Sales Invoice` records, allowing the frontend to generate a clean "Customer Outstanding" leaderboard.

### Stock Balance Report Enhancement
- **Endpoint**: `goldretail.api.reports.get_stock_balance`
- **Logic**: The standard Frappe `Bin` doctype tracks `actual_qty` but lacks historical incoming and outgoing totals. This endpoint:
  1. Queries the `Bin` for the current balance.
  2. Queries the `Item` master to fetch the item's `item_name` and thumbnail `image`.
  3. Executes a raw SQL query against `Stock Ledger Entry` to calculate the aggregate `in_qty` and `out_qty` dynamically.
- **UI Integration**: The frontend `StockBalance.jsx` uses `useFrappeGetCall` to consume this endpoint. It renders high-res click-to-expand item images, Item Names alongside Item Codes, and complete In/Out/Balance tracking.
