import frappe

@frappe.whitelist()
def get_stock_balance(warehouse=None, item=None, show_zero_balance=0):
    """
    Returns a list of items with their available qty, in qty, out qty, item name, and image.
    Aggregates data from Bin and Stock Ledger Entry.
    """
    
    filters = []
    if not frappe.utils.cint(show_zero_balance):
        filters.append(["actual_qty", "!=", 0])
    if warehouse:
        filters.append(["warehouse", "=", warehouse])
    if item:
        filters.append(["item_code", "=", item])
        
    # Get standard bin data
    bins = frappe.get_all(
        "Bin", 
        fields=["item_code", "warehouse", "actual_qty", "stock_value"], 
        filters=filters
    )
    
    if not bins:
        return []
        
    # Fetch Item details (name, image)
    item_codes = [b.item_code for b in bins]
    items = frappe.get_all(
        "Item",
        fields=["name", "item_name", "description", "image"],
        filters=[["name", "in", item_codes]]
    )
    
    item_map = {i.name: i for i in items}
    
    # Fetch in/out quantities from Stock Ledger Entry
    # SLE logs every transaction. actual_qty > 0 is incoming, actual_qty < 0 is outgoing.
    sle_query = """
        SELECT 
            item_code, 
            warehouse,
            SUM(CASE WHEN actual_qty > 0 THEN actual_qty ELSE 0 END) as in_qty,
            SUM(CASE WHEN actual_qty < 0 THEN ABS(actual_qty) ELSE 0 END) as out_qty
        FROM `tabStock Ledger Entry`
        WHERE is_cancelled = 0
        GROUP BY item_code, warehouse
    """
    sle_data = frappe.db.sql(sle_query, as_dict=True)
    
    sle_map = {}
    for row in sle_data:
        key = f"{row.item_code}-{row.warehouse}"
        sle_map[key] = row
        
    # Merge data
    results = []
    for b in bins:
        key = f"{b.item_code}-{b.warehouse}"
        itm = item_map.get(b.item_code, {})
        sle = sle_map.get(key, {})
        
        results.append({
            "id": key,
            "item_code": b.item_code,
            "item_name": itm.get("item_name") or b.item_code,
            "description": itm.get("description") or "",
            "image": itm.get("image") or "",
            "warehouse": b.warehouse,
            "actual_qty": b.actual_qty,
            "stock_value": b.stock_value,
            "in_qty": sle.get("in_qty") or 0,
            "out_qty": sle.get("out_qty") or 0
        })
        
    return results

@frappe.whitelist()
def get_item_ledger(item_code, warehouse=None, page=1, page_size=20):
    filters = {"item_code": item_code, "is_cancelled": 0}
    if warehouse:
        filters["warehouse"] = warehouse
        
    page = frappe.utils.cint(page) or 1
    page_size = frappe.utils.cint(page_size) or 20
    limit_start = (page - 1) * page_size
        
    entries = frappe.get_all("Stock Ledger Entry", 
                             filters=filters,
                             fields=["posting_date", "posting_time", "voucher_type", "voucher_no", "actual_qty", "warehouse"],
                             order_by="posting_date desc, posting_time desc",
                             limit_start=limit_start,
                             limit=page_size)
                             
    total_count = frappe.db.count("Stock Ledger Entry", filters=filters)
                             
    results = []
    for e in entries:
        party = ""
        if e.voucher_type and e.voucher_no:
            try:
                if e.voucher_type in ["Sales Invoice", "Delivery Note", "Sales Receipt"]:
                    party = frappe.db.get_value(e.voucher_type, e.voucher_no, "customer_name") or frappe.db.get_value(e.voucher_type, e.voucher_no, "customer")
                elif e.voucher_type in ["Purchase Invoice", "Purchase Receipt"]:
                    party = frappe.db.get_value(e.voucher_type, e.voucher_no, "supplier_name") or frappe.db.get_value(e.voucher_type, e.voucher_no, "supplier")
                elif e.voucher_type == "Stock Entry":
                    party = "Internal Transfer"
            except Exception:
                pass
                
        results.append({
            "posting_date": e.posting_date,
            "voucher_type": e.voucher_type,
            "voucher_no": e.voucher_no,
            "in_qty": e.actual_qty if e.actual_qty > 0 else 0,
            "out_qty": abs(e.actual_qty) if e.actual_qty < 0 else 0,
            "party": party or "-",
            "warehouse": e.warehouse
        })
        
    return {
        "data": results,
        "total_count": total_count,
        "page": page,
        "page_size": page_size
    }
