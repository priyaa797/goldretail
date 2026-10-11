import frappe
import json

@frappe.whitelist()
def get_carton_packings():
    uom_conversions = frappe.get_all(
        "UOM Conversion Detail",
        filters={
            "parenttype": "Item",
            "uom": ["in", ["Carton", "CTN", "ctn", "CARTON", "Ctn"]]
        },
        fields=["parent", "conversion_factor"],
        ignore_permissions=True,
        limit_page_length=50000
    )
    return {u.parent: u.conversion_factor for u in uom_conversions}

@frappe.whitelist()
def generate_pdf(item_codes, price_list="Wholesale", discount=0.0):
    if isinstance(item_codes, str):
        item_codes = json.loads(item_codes)
    
    try:
        discount = float(discount)
    except (ValueError, TypeError):
        discount = 0.0
        
    items = frappe.get_all("Item", 
                           filters={"item_code": ["in", item_codes]}, 
                           fields=["item_code", "item_name", "description", "image", "stock_uom"])
                           
    prices = frappe.get_all("Item Price",
                            filters={"item_code": ["in", item_codes], "price_list": price_list},
                            fields=["item_code", "price_list_rate"])
                            
    # Increase price by the given discount percentage
    price_map = {}
    for p in prices:
        base_price = p.price_list_rate or 0
        if discount:
            price_map[p.item_code] = base_price * (1 + (discount / 100.0))
        else:
            price_map[p.item_code] = base_price

    # Fetch Carton conversion factor for packaging detail
    uom_conversions = frappe.get_all(
        "UOM Conversion Detail",
        filters={
            "parenttype": "Item",
            "uom": ["in", ["Carton", "CTN", "ctn", "CARTON", "Ctn"]],
            "parent": ["in", item_codes]
        },
        fields=["parent", "conversion_factor"],
        ignore_permissions=True,
        limit_page_length=50000
    )
    carton_map = {u.parent: u.conversion_factor for u in uom_conversions}
    
    # Sort items by the order they were provided
    item_dict = {item.item_code: item for item in items}
    sorted_items = [item_dict[code] for code in item_codes if code in item_dict]
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: Arial, sans-serif;
            margin: 0; 
            padding: 0;
            background-color: #fff;
        }
        .page {
            width: 100%;
            page-break-after: always;
        }
        .page:last-child {
            page-break-after: auto;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
            font-size: 24px;
            font-weight: bold;
            color: #000;
        }
        .grid {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .grid td {
            width: 33.33%;
            border: 1px solid #333;
            padding: 4px 6px;
            vertical-align: top;
            text-align: left;
            height: 250px;
            box-sizing: border-box;
        }
        .item-image {
            width: 100%;
            height: 175px;
            object-fit: contain;
            display: block;
            margin: 0 auto 4px auto;
        }
        .title-line {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin-top: 2px;
            line-height: 1.2;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        .item-code {
            color: #ea580c; /* Orange */
        }
        .item-name {
            color: #000;
        }
        .item-desc {
            font-size: 10px;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
            text-align: left;
            margin-top: 2px;
            line-height: 1.2;
            max-height: 26px;
            overflow: hidden;
        }
        .bottom-line {
            font-size: 11px;
            font-weight: bold;
            text-align: left;
            margin-top: 2px;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
        }
        .ctn-detail {
            color: #000;
            font-weight: bold;
        }
        .price-str {
            color: #e00000; /* Bold Red */
            font-weight: bold;
            font-size: 12px;
        }
    </style>
    </head>
    <body>
    """
    
    ITEMS_PER_PAGE = 9
    ITEMS_PER_ROW = 3
    
    for page_idx in range(0, len(sorted_items), ITEMS_PER_PAGE):
        page_items = sorted_items[page_idx:page_idx + ITEMS_PER_PAGE]
        
        html += '<div class="page">'
        if page_idx == 0:
            html += '<div class="header">Product Catalog</div>'
            
        html += '<table class="grid">'
        
        for row_idx in range(0, len(page_items), ITEMS_PER_ROW):
            row_items = page_items[row_idx:row_idx + ITEMS_PER_ROW]
            html += '<tr>'
            
            for item in row_items:
                img_src = item.image if item.image else ""
                # Ensure the image URL is absolute for wkhtmltopdf
                if img_src and img_src.startswith('/'):
                    img_src = frappe.utils.get_url() + img_src
                    
                desc = item.description or ""
                # Strip HTML from description
                desc = frappe.utils.strip_html_tags(desc).strip()
                
                # Format Carton detail
                ctn_qty = carton_map.get(item.item_code)
                ctn_str = ""
                if ctn_qty:
                    try:
                        ctn_val = float(ctn_qty)
                        ctn_qty_formatted = int(ctn_val) if ctn_val.is_integer() else ctn_val
                    except (ValueError, TypeError):
                        ctn_qty_formatted = ctn_qty
                        
                    stock_uom = (item.stock_uom or "").strip().upper()
                    if stock_uom in ["SET", "SETS"]:
                        uom_str = "SET"
                    elif stock_uom in ["NOS", "PCS", "PIECE", "PIECES", "PC"] or not stock_uom:
                        uom_str = "PCS"
                    else:
                        uom_str = stock_uom
                        
                    ctn_str = f'<span class="ctn-detail">{ctn_qty_formatted} {uom_str} IN CTN</span>'
                
                price = price_map.get(item.item_code)
                price_str = f'<span class="price-str">NP {int(round(price))}</span>' if price else ""
                
                spacer = "&nbsp;&nbsp;" if ctn_str and price_str else ""
                bottom_line = f"{ctn_str}{spacer}{price_str}"
                
                html += f"""
                <td>
                    <img src="{img_src}" class="item-image" alt="No Image" onerror="this.style.display='none'">
                    <div class="title-line">
                        <span class="item-code">{item.item_code}</span> <span class="item-name">{item.item_name}</span>
                    </div>
                    <div class="item-desc">{desc}</div>
                    <div class="bottom-line">{bottom_line}</div>
                </td>
                """
                
            # Fill empty columns if the row is incomplete
            for _ in range(ITEMS_PER_ROW - len(row_items)):
                html += '<td></td>'
                
            html += '</tr>'
            
        html += '</table></div>'
        
    html += '</body></html>'
    
    # Generate PDF with minimal margins
    options = {
        "margin-top": "5mm",
        "margin-right": "5mm",
        "margin-bottom": "5mm",
        "margin-left": "5mm",
        "page-size": "A4"
    }
    pdf_bytes = frappe.utils.pdf.get_pdf(html, options=options)
    
    # Save to File doctype
    file_name = f"Catalog_{frappe.utils.nowdate()}.pdf"
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": file_name,
        "is_private": 0,
        "content": pdf_bytes
    })
    file_doc.save(ignore_permissions=True)
    
    return file_doc.file_url
