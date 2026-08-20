import frappe

def import_data():
    def ensure_doc(doctype, docname, data=None):
        if not frappe.db.exists(doctype, docname):
            doc = frappe.new_doc(doctype)
            if data:
                doc.update(data)
            doc.insert(ignore_permissions=True)
            print(f"Created {doctype} {docname}")
            return doc
        return frappe.get_doc(doctype, docname)

    # Handle India Compliance HSN requirement
    hsn_code = None
    if frappe.db.exists("DocType", "GST HSN Code"):
        if not frappe.db.exists("GST HSN Code", "999999"):
            hsn = frappe.new_doc("GST HSN Code")
            hsn.hsn_code = "999999"
            hsn.description = "Dummy HSN"
            hsn.insert(ignore_permissions=True)
        hsn_code = "999999"

    # 1. Item Categories
    categories = ["Glass", "Cup", "Bowl", "Plate"]
    sub_categories = ["Steel", "Plastic", "Glass"]
    types = ["Kitchen Item", "Show Piece"]

    for cat in categories:
        ensure_doc("Item Category", cat, {"category_name": cat})
    for sub in sub_categories:
        ensure_doc("Item Sub Category", sub, {"sub_category_name": sub})
    for typ in types:
        ensure_doc("Item Type", typ, {"type_name": typ})

    items = [
        {"item_name": "Soda Glass", "item_code": "GL-001", "category": "Glass", "sub_category": "Steel", "type": "Kitchen Item", "rate": 100, "group": "Products"},
        {"item_name": "Cup", "item_code": "Cu-001", "category": "Cup", "sub_category": "Plastic", "type": "Show Piece", "rate": 40, "group": "Products"},
        {"item_name": "Bowl", "item_code": "Bw-001", "category": "Bowl", "sub_category": "Glass", "type": "Kitchen Item", "rate": 110, "group": "Products"},
        {"item_name": "Plate", "item_code": "Pl-001", "category": "Plate", "sub_category": "Plastic", "type": "Kitchen Item", "rate": 60, "group": "Products"},
        {"item_name": "Plate", "item_code": "Pl-002", "category": "Plate", "sub_category": "Steel", "type": "Kitchen Item", "rate": 90, "group": "Products"},
        {"item_name": "Plate", "item_code": "Pl-003", "category": "Plate", "sub_category": "Glass", "type": "Kitchen Item", "rate": 120, "group": "Products"}
    ]
    
    ensure_doc("Item Group", "Products", {"item_group_name": "Products", "is_group": 0, "parent_item_group": "All Item Groups"})
    
    for itm in items:
        if not frappe.db.exists("Item", itm["item_code"]):
            doc = frappe.new_doc("Item")
            doc.item_code = itm["item_code"]
            doc.item_name = itm["item_name"]
            doc.item_group = itm["group"]
            doc.stock_uom = "Nos"
            doc.category = itm["category"]
            doc.sub_category = itm["sub_category"]
            doc.type = itm["type"]
            doc.standard_rate = itm["rate"]
            if hsn_code:
                doc.gst_hsn_code = hsn_code
            doc.insert(ignore_permissions=True)
            print(f"Created Item {itm['item_code']}")

    # 2. Customers
    ensure_doc("Customer Group", "Retail", {"customer_group_name": "Retail"})
    for c in ["X", "Y", "Z"]:
        ensure_doc("Customer", c, {"customer_name": c, "customer_group": "Retail"})

    # 3. Suppliers
    ensure_doc("Supplier Group", "Local", {"supplier_group_name": "Local"})
    for s in ["A", "B", "C"]:
        ensure_doc("Supplier", s, {"supplier_name": s, "supplier_group": "Local"})

    print("Master Data successfully imported!")
    frappe.db.commit()
    
    # Try creating transactions
    try:
        company = frappe.db.get_all("Company", limit=1)
        if not company:
            print("No company found, skipping transactions.")
            return
        company = company[0].name
        
        # We need a warehouse
        warehouse = f"Stores - {frappe.db.get_value('Company', company, 'abbr')}"
        if not frappe.db.exists("Warehouse", warehouse):
            wdoc = frappe.new_doc("Warehouse")
            wdoc.warehouse_name = "Stores"
            wdoc.company = company
            wdoc.is_group = 0
            wdoc.insert(ignore_permissions=True)
            warehouse = wdoc.name

        if not frappe.db.exists("Purchase Receipt", {"supplier": "A", "posting_date": "2026-08-13"}):
            pr_items = [
                {"item_code": "Cu-001", "qty": 400, "rate": 30},
                {"item_code": "Bw-001", "qty": 200, "rate": 80},
                {"item_code": "Pl-001", "qty": 100, "rate": 20}
            ]
            pr = frappe.new_doc("Purchase Receipt")
            pr.supplier = "A"
            pr.company = company
            pr.posting_date = "2026-08-13"
            pr.set_posting_time = 1
            for itm in pr_items:
                pr.append("items", {
                    "item_code": itm["item_code"],
                    "qty": itm["qty"],
                    "rate": itm["rate"],
                    "warehouse": warehouse
                })
            pr.insert(ignore_permissions=True)
            print(f"Created Purchase Receipt {pr.name}")

        if not frappe.db.exists("Delivery Note", {"customer": "X", "posting_date": "2026-08-13"}):
            si_items = [
                {"item_code": "Cu-001", "qty": 200, "rate": 40},
                {"item_code": "Bw-001", "qty": 100, "rate": 110},
                {"item_code": "Pl-001", "qty": 100, "rate": 60}
            ]
            si = frappe.new_doc("Delivery Note")
            si.customer = "X"
            si.company = company
            si.posting_date = "2026-08-13"
            si.set_posting_time = 1
            for itm in si_items:
                si.append("items", {
                    "item_code": itm["item_code"],
                    "qty": itm["qty"],
                    "rate": itm["rate"],
                    "warehouse": warehouse
                })
            si.insert(ignore_permissions=True)
            print(f"Created Delivery Note {si.name}")

        frappe.db.commit()
    except Exception as e:
        print(f"Transactions skipped due to configuration: {e}")
