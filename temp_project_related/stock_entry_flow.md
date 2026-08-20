# Stock Entry & Transaction Flow in ERPNext

This document outlines the standard mandatory steps for completing a full inventory and accounting cycle using ERPNext, adapted for the Gold Retail project.

## 1. Master Data Creation (Prerequisites)
Before processing any transactions, ensure the following masters are set up:
- **Items:** Create the Item in the Item Master. Assign the appropriate Item Group, and the new custom fields (Category, Sub-category, Type). Ensure default Unit of Measure (UOM) is set.
- **Customers & Suppliers:** Ensure the Customer and Supplier are created.

## 2. Inbound Flow (Purchasing & Stock In)
To properly receive stock and impact your supplier ledger, follow this 3-step cycle:

1. **Purchase Order (PO):**
   - *Purpose:* Official document sent to the supplier confirming the intent to buy. (Does *not* affect stock or accounting).
   - *Mandatory Fields:* Supplier, Date, Item(s), Qty, Rate.

2. **Purchase Receipt (PR) - [STOCK IMPACT]:**
   - *Purpose:* Records the actual physical receipt of goods into your warehouse.
   - *Action:* Created from the Purchase Order. Submitting this document **increases your stock balance** (Stock Ledger Entry).
   - *Custom Feature:* **Barcode Generation** will be triggered at this step for incoming items.

3. **Purchase Invoice (PI) - [ACCOUNTING IMPACT]:**
   - *Purpose:* Records the bill/invoice from the supplier.
   - *Action:* Created from the Purchase Receipt. Submitting this **increases your Supplier Outstanding** (Accounts Payable).

*(Note: For a simpler flow, you can directly create a Purchase Invoice and check the "Update Stock" box, skipping the PO and PR. We can decide which flow fits best.)*

## 3. Outbound Flow (Selling & Stock Out)
To properly dispatch stock and update your customer ledger:

1. **Sales Order (SO):**
   - *Purpose:* Confirmation of the sale to the customer. (Does *not* affect stock or accounting).
   - *Mandatory Fields:* Customer, Delivery Date, Item(s), Qty, Rate.

2. **Delivery Note (DN) - [STOCK IMPACT]:**
   - *Purpose:* Physical dispatch of goods to the customer.
   - *Action:* Created from the Sales Order. Submitting this **decreases your stock balance**.

3. **Sales Invoice (SI) - [ACCOUNTING IMPACT]:**
   - *Purpose:* Bill given to the customer.
   - *Action:* Created from the Delivery Note. Submitting this **increases your Customer Outstanding** (Accounts Receivable).

*(Note: Similarly, you can skip the SO and DN by directly creating a Sales Invoice with "Update Stock" checked.)*
