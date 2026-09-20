import frappe

def auto_pay_purchase_invoice(doc, method):
    if doc.update_stock and doc.grand_total > 0 and doc.outstanding_amount > 0:
        pe = frappe.new_doc("Payment Entry")
        pe.payment_type = "Pay"
        pe.party_type = "Supplier"
        pe.party = doc.supplier
        pe.paid_from = frappe.db.get_value("Account", {"account_type": "Cash", "company": doc.company, "is_group": 0}, "name")
        pe.paid_to = doc.credit_to
        pe.paid_amount = doc.grand_total
        pe.received_amount = doc.grand_total
        pe.append("references", {
            "reference_doctype": "Purchase Invoice",
            "reference_name": doc.name,
            "allocated_amount": doc.grand_total
        })
        pe.insert(ignore_permissions=True)
        pe.submit()

@frappe.whitelist()
def allocate_customer_payment(customer, amount):
    amount = float(amount)
    if amount <= 0:
        frappe.throw("Amount must be greater than zero")

    invoices = frappe.get_all(
        "Sales Invoice",
        filters={"customer": customer, "docstatus": 1, "outstanding_amount": (">", 0)},
        fields=["name", "outstanding_amount", "company", "debit_to"],
        order_by="creation asc"
    )

    if not invoices:
        frappe.throw(f"No outstanding Sales Invoices found for {customer}")

    company = invoices[0].company
    paid_to_account = frappe.db.get_value("Account", {"account_type": "Cash", "company": company, "is_group": 0}, "name")

    total_allocated = 0
    payments_created = []

    for inv in invoices:
        if amount <= 0:
            break

        allocate = min(amount, inv.outstanding_amount)
        amount -= allocate
        total_allocated += allocate

        pe = frappe.new_doc("Payment Entry")
        pe.payment_type = "Receive"
        pe.party_type = "Customer"
        pe.party = customer
        pe.paid_from = inv.debit_to
        pe.paid_to = paid_to_account
        pe.paid_amount = allocate
        pe.received_amount = allocate
        pe.append("references", {
            "reference_doctype": "Sales Invoice",
            "reference_name": inv.name,
            "allocated_amount": allocate
        })
        pe.insert(ignore_permissions=True)
        pe.submit()
        payments_created.append(pe.name)

    return {
        "allocated": total_allocated,
        "remaining": amount,
        "payments": payments_created
    }

@frappe.whitelist()
def get_customer_outstanding():
    """
    Returns a list of customers and their total outstanding amount
    aggregated from all submitted Sales Invoices.
    """
    query = """
        SELECT 
            customer,
            SUM(outstanding_amount) as total_outstanding
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND outstanding_amount > 0
        GROUP BY customer
        ORDER BY total_outstanding DESC
    """
    return frappe.db.sql(query, as_dict=True)

@frappe.whitelist()
def get_customer_balances():
    """
    Returns a list of all customers, their total pending amount, 
    and details of their last payment.
    """
    query = """
        SELECT 
            c.name as customer,
            COALESCE((SELECT SUM(outstanding_amount) FROM `tabSales Invoice` WHERE docstatus = 1 AND customer = c.name), 0) as total_outstanding,
            (SELECT posting_date FROM `tabPayment Entry` WHERE docstatus = 1 AND party_type = 'Customer' AND party = c.name ORDER BY posting_date DESC, creation DESC LIMIT 1) as last_payment_date,
            (SELECT paid_amount FROM `tabPayment Entry` WHERE docstatus = 1 AND party_type = 'Customer' AND party = c.name ORDER BY posting_date DESC, creation DESC LIMIT 1) as last_payment_amount
        FROM `tabCustomer` c
        ORDER BY total_outstanding DESC
    """
    return frappe.db.sql(query, as_dict=True)

@frappe.whitelist()
def get_customer_ledger(customer):
    """
    Returns a chronological ledger for a specific customer, combining
    Sales Invoices (debits) and Payment Entries (credits).
    """
    query = """
        SELECT 
            posting_date as date, 
            name as reference,
            grand_total as invoice_amount, 
            0 as payment_amount 
        FROM `tabSales Invoice` 
        WHERE docstatus = 1 AND customer = %s

        UNION ALL

        SELECT 
            posting_date as date, 
            name as reference,
            0 as invoice_amount, 
            paid_amount as payment_amount 
        FROM `tabPayment Entry` 
        WHERE docstatus = 1 AND party_type = 'Customer' AND party = %s

        ORDER BY date ASC, reference ASC
    """
    return frappe.db.sql(query, (customer, customer), as_dict=True)
