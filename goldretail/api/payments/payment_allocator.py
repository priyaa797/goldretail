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
            0 as payment_amount,
            'Sales Invoice' as voucher_type
        FROM `tabSales Invoice` 
        WHERE docstatus = 1 AND customer = %s

        UNION ALL

        SELECT 
            posting_date as date, 
            name as reference,
            0 as invoice_amount, 
            paid_amount as payment_amount,
            'Payment Entry' as voucher_type
        FROM `tabPayment Entry` 
        WHERE docstatus = 1 AND party_type = 'Customer' AND party = %s

        ORDER BY date ASC, reference ASC
    """
    return frappe.db.sql(query, (customer, customer), as_dict=True)


@frappe.whitelist()
def export_customer_ledger(customer):
    """
    Exports customer transaction history (ledger) to Excel (.xlsx) with:
    - ASC order records
    - Date, Reference, Invoice Amount, Payment Amount, Running Balance
    - Total row at the end
    """
    import re
    from frappe.utils import now_datetime
    from frappe.utils.xlsxutils import make_xlsx

    if not customer:
        frappe.throw("Customer parameter is required.")

    records = get_customer_ledger(customer)

    headers = [
        "Date",
        "Reference",
        "Invoice Amount (₹)",
        "Payment Amount (₹)",
        "Running Balance (₹)"
    ]

    export_rows = []
    running_balance = 0.0
    total_invoice = 0.0
    total_payment = 0.0

    # Ensure chronological order (ASC)
    for row in records:
        inv = float(row.get("invoice_amount") or 0.0)
        pay = float(row.get("payment_amount") or 0.0)
        running_balance += (inv - pay)
        total_invoice += inv
        total_payment += pay

        dt = row.get("date")
        date_str = dt.strftime("%d %b %Y") if hasattr(dt, "strftime") else (str(dt) if dt else "-")

        export_rows.append([
            date_str,
            row.get("reference") or "",
            inv,
            pay,
            running_balance
        ])

    # Total row at the last
    total_balance = total_invoice - total_payment
    export_rows.append([
        "Total",
        "",
        round(total_invoice, 2),
        round(total_payment, 2),
        round(total_balance, 2)
    ])

    import openpyxl
    from openpyxl.styles import Font, Border, Side
    from openpyxl.utils import get_column_letter
    from io import BytesIO

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transaction History"

    # Add Header
    ws.append(headers)
    header_font = Font(name="Calibri", bold=True)
    for col_idx in range(1, len(headers) + 1):
        ws.cell(row=1, column=col_idx).font = header_font

    # Add Data Rows
    for row_data in export_rows:
        ws.append(row_data)

    # Make Total row (the last row) BOLD with accounting borders
    last_row_idx = ws.max_row
    bold_font = Font(name="Calibri", bold=True)
    total_border = Border(
        top=Side(style="thin"),
        bottom=Side(style="double")
    )
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=last_row_idx, column=col_idx)
        cell.font = bold_font
        cell.border = total_border

    # Set column widths
    column_widths = [16, 26, 22, 22, 24]
    for i, col_w in enumerate(column_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = col_w

    xlsx_file = BytesIO()
    wb.save(xlsx_file)

    date_str = now_datetime().strftime("%d%b%Y").lower()
    safe_customer = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(customer).strip())
    filename = f"{safe_customer}_transaction_history_{date_str}.xlsx"

    frappe.response['filename'] = filename
    frappe.response['filecontent'] = xlsx_file.getvalue()
    frappe.response['type'] = 'binary'


