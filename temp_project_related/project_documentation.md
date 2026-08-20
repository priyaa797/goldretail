# Project Documentation & Decision Log

## Overview
This document serves as a continuous log of conversations, requirements, and architectural decisions for the development of our custom Frappe application.

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

## 2. Ongoing Decisions
*(To be updated as we finalize the app architecture and feature set)*

### Transaction Workflow (Simplified)
To achieve a streamlined process that affects both inventory and accounting simultaneously without requiring intermediate documents:

1. **Entering Stock & Amount (Purchase)**
   - **Document:** Purchase Invoice
   - **Key Action:** Check the **"Update Stock"** checkbox before submitting.
   - **Result:** Increases inventory (Stock Ledger) and increases outstanding payable to the Supplier (Accounts Payable) simultaneously.

2. **Doing Sales (Selling)**
   - **Document:** Sales Invoice
   - **Key Action:** Check the **"Update Stock"** checkbox before submitting.
   - **Result:** Decreases inventory (Stock Ledger) and increases the pending amount the Customer owes (Accounts Receivable) simultaneously.

3. **Entering Payment (Receiving Money)**
   - **Document:** Payment Entry
   - **Key Action:** Click **Create > Payment** directly from the submitted Sales Invoice.
   - **Result:** Reduces or clears the customer's outstanding balance (Accounts Receivable).
