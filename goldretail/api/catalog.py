import frappe
import json

@frappe.whitelist()
def generate_pdf(item_codes):
    if isinstance(item_codes, str):
        item_codes = json.loads(item_codes)
        
    items = frappe.get_all("Item", 
                           filters={"item_code": ["in", item_codes]}, 
                           fields=["item_code", "item_name", "description", "image"])
    
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
        }
        .grid {
            width: 100%;
            border-collapse: collapse;
        }
        .grid td {
            width: 33.33%;
            border: 1px solid #999;
            padding: 4px;
            vertical-align: top;
            text-align: center;
            height: 250px;
            box-sizing: border-box;
        }
        .item-image {
            width: 100%;
            height: 180px;
            object-fit: contain;
            margin-bottom: 4px;
        }
        .title-line {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin-top: 2px;
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
            max-height: 40px;
            overflow: hidden;
        }
    </style>
    </head>
    <body>
    """
    
    ITEMS_PER_PAGE = 12
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
                desc = frappe.utils.strip_html_tags(desc)
                
                html += f"""
                <td>
                    <img src="{img_src}" class="item-image" alt="No Image" onerror="this.style.display='none'">
                    <div class="title-line">
                        <span class="item-code">{item.item_code}</span> <span class="item-name">{item.item_name}</span>
                    </div>
                    <div class="item-desc">{desc}</div>
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
