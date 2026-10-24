import frappe

@frappe.whitelist()
def get_stock_balance(warehouse=None, item=None, show_zero_balance=0, category=None, sub_category=None, type=None, item_type=None):
    """
    Returns a list of items with their available qty, in qty, out qty, item name, and image.
    Aggregates data from Bin and Stock Ledger Entry.
    """
    selected_type = type or item_type

    # Filter by Item fields (category, sub_category, type)
    item_filters = []
    if category:
        item_filters.append(["category", "=", category])
    if sub_category:
        item_filters.append(["sub_category", "=", sub_category])
    if selected_type:
        item_filters.append(["type", "=", selected_type])

    filtered_item_codes = None
    if item_filters:
        matching_items = frappe.get_all("Item", filters=item_filters, pluck="name")
        if not matching_items:
            return []
        filtered_item_codes = matching_items

    filters = []
    if not frappe.utils.cint(show_zero_balance):
        filters.append(["actual_qty", "!=", 0])
    if warehouse:
        filters.append(["warehouse", "=", warehouse])
    if item:
        if filtered_item_codes is not None and item not in filtered_item_codes:
            return []
        filters.append(["item_code", "=", item])
    elif filtered_item_codes is not None:
        filters.append(["item_code", "in", filtered_item_codes])
        
    # Get standard bin data
    bins = frappe.get_all(
        "Bin", 
        fields=["item_code", "warehouse", "actual_qty", "stock_value"], 
        filters=filters
    )
    
    if not bins:
        return []
        
    # Fetch Item details (name, image, category, sub_category, type)
    item_codes = [b.item_code for b in bins]
    items = frappe.get_all(
        "Item",
        fields=["name", "item_name", "description", "image", "category", "sub_category", "type"],
        filters=[["name", "in", item_codes]]
    )
    
    item_map = {i.name: i for i in items}

    # Bulk-fetch Carton UOM conversion factors for all items in the report
    uom_conversions = frappe.get_all(
        "UOM Conversion Detail",
        filters={
            "parenttype": "Item",
            "uom": ["in", ["Carton", "CTN", "ctn", "CARTON", "Ctn"]],
            "parent": ["in", item_codes],
        },
        fields=["parent", "conversion_factor"],
        ignore_permissions=True,
        limit_page_length=50000,
    )
    carton_factor_map = {u.parent: u.conversion_factor for u in uom_conversions}

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

        carton_factor = carton_factor_map.get(b.item_code)
        if carton_factor and float(carton_factor) > 0:
            balance_carton = round(float(b.actual_qty) / float(carton_factor), 2)
        else:
            balance_carton = None

        results.append({
            "id": key,
            "item_code": b.item_code,
            "item_name": itm.get("item_name") or b.item_code,
            "description": itm.get("description") or "",
            "image": itm.get("image") or "",
            "category": itm.get("category") or "",
            "sub_category": itm.get("sub_category") or "",
            "type": itm.get("type") or "",
            "warehouse": b.warehouse,
            "actual_qty": b.actual_qty,
            "stock_value": b.stock_value,
            "in_qty": sle.get("in_qty") or 0,
            "out_qty": sle.get("out_qty") or 0,
            "balance_carton": balance_carton,
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


@frappe.whitelist()
def export_stock_balance(file_format="excel", warehouse=None, item=None, show_zero_balance=0, category=None, sub_category=None, type=None, item_type=None):
    from frappe.utils import now_datetime, strip_html
    from frappe.utils.xlsxutils import make_xlsx
    from frappe.utils.pdf import get_pdf

    data = get_stock_balance(
        warehouse=warehouse,
        item=item,
        show_zero_balance=show_zero_balance,
        category=category,
        sub_category=sub_category,
        type=type,
        item_type=item_type
    )

    date_str = now_datetime().strftime("%d%b%Y").lower()
    filename = f"stock balance {date_str}"

    headers = [
        "Item code",
        "Item name",
        "Balance carton",
        "Warehouse",
        "In qty",
        "Out qty",
        "Balance qty"
    ]

    export_rows = []
    for r in data:
        balance_carton = r.get("balance_carton")
        carton_val = float(balance_carton) if balance_carton is not None else ""
        export_rows.append([
            r.get("item_code") or "",
            r.get("item_name") or "",
            carton_val,
            r.get("warehouse") or "",
            float(r.get("in_qty") or 0),
            float(r.get("out_qty") or 0),
            float(r.get("actual_qty") or 0)
        ])

    file_format = (file_format or "excel").lower()

    if file_format in ["excel", "xlsx"]:
        xlsx_data = [headers] + export_rows
        xlsx_file = make_xlsx(xlsx_data, "Stock Balance")
        frappe.response['filename'] = f"{filename}.xlsx"
        frappe.response['filecontent'] = xlsx_file.getvalue()
        frappe.response['type'] = 'binary'
    elif file_format == "pdf":
        html = generate_stock_balance_pdf_html(headers, export_rows, warehouse, category, sub_category, type or item_type, date_str)
        frappe.response['filename'] = f"{filename}.pdf"
        frappe.response['filecontent'] = get_pdf(html, {"orientation": "Landscape", "page-size": "A4"})
        frappe.response['type'] = 'binary'
    else:
        frappe.throw("Invalid format. Use 'excel' or 'pdf'.")


def generate_stock_balance_pdf_html(headers, rows, warehouse=None, category=None, sub_category=None, item_type=None, date_str=""):
    filters_desc = []
    if warehouse:
        filters_desc.append(f"Warehouse: <b>{warehouse}</b>")
    if category:
        filters_desc.append(f"Category: <b>{category}</b>")
    if sub_category:
        filters_desc.append(f"Sub Category: <b>{sub_category}</b>")
    if item_type:
        filters_desc.append(f"Type: <b>{item_type}</b>")
    filter_text = " | ".join(filters_desc) if filters_desc else "All Warehouses & Items"

    table_rows = []
    for r in rows:
        carton_display = f"{r[2]:.2f}" if isinstance(r[2], (int, float)) else (str(r[2]) if r[2] else "-")
        table_rows.append(f"""
            <tr>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px; font-weight: bold;">{r[0]}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px;">{r[1]}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px; text-align: right; font-weight: bold;">{carton_display}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px;">{r[3]}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px; text-align: right;">{r[4]:,.2f}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px; text-align: right;">{r[5]:,.2f}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; font-size: 10px; text-align: right; font-weight: bold;">{r[6]:,.2f}</td>
            </tr>
        """)

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 10px;
                color: #333;
            }}
            .title {{
                font-size: 16px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 0;
            }}
            .filters {{
                font-size: 10px;
                color: #555;
                margin-top: 3px;
            }}
            .date {{
                font-size: 10px;
                font-weight: bold;
                text-align: right;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
            }}
            th {{
                background-color: #f1f3f5;
                border: 1px solid #bbb;
                padding: 5px 6px;
                font-size: 9.5px;
                font-weight: bold;
                text-transform: uppercase;
                text-align: left;
            }}
            th.right {{
                text-align: right;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            .footer {{
                margin-top: 10px;
                font-size: 9px;
                color: #777;
                text-align: right;
            }}
        </style>
    </head>
    <body>
        <table style="width: 100%; border: none; margin-bottom: 6px;">
            <tr>
                <td style="border: none; padding: 0;">
                    <h2 class="title">Stock Balance Report</h2>
                    <div class="filters">{filter_text}</div>
                </td>
                <td style="border: none; padding: 0; text-align: right; vertical-align: top;">
                    <div class="date">Date: {date_str}</div>
                    <div style="font-size: 10px; color: #666;">Total Items: {len(rows)}</div>
                </td>
            </tr>
        </table>

        <table>
            <thead>
                <tr>
                    <th style="width: 16%;">Item Code</th>
                    <th style="width: 28%;">Item Name</th>
                    <th class="right" style="width: 14%;">Balance Carton</th>
                    <th style="width: 18%;">Warehouse</th>
                    <th class="right" style="width: 8%;">In Qty</th>
                    <th class="right" style="width: 8%;">Out Qty</th>
                    <th class="right" style="width: 8%;">Balance Qty</th>
                </tr>
            </thead>
            <tbody>
                {''.join(table_rows)}
            </tbody>
        </table>

        <div class="footer">
            Generated on {date_str} | Stock Balance Report
        </div>
    </body>
    </html>
    """
    return html
