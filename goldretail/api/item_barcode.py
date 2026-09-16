import frappe
import random
import string
import barcode
from barcode.writer import ImageWriter
import io

@frappe.whitelist()
def generate_barcode(item_code):
    item = frappe.get_doc("Item", item_code)
    
    # Generate barcode value (item_code + 4 random chars)
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    barcode_val = f"{item_code}-{suffix}"
    
    # Generate barcode image
    Code128 = barcode.get_barcode_class('code128')
    rv = io.BytesIO()
    Code128(barcode_val, writer=ImageWriter()).write(rv)
    
    # Save file
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": f"{barcode_val}.png",
        "attached_to_doctype": "Item",
        "attached_to_name": item_code,
        "content": rv.getvalue(),
        "is_private": 0
    })
    file_doc.save(ignore_permissions=True)
    
    # Append to Item
    item.append("barcodes", {
        "barcode": barcode_val,
        "uom": item.stock_uom or "Nos",
        "custom_barcode_image": file_doc.file_url
    })
    item.save(ignore_permissions=True)
    
    return barcode_val

@frappe.whitelist()
def get_item_by_barcode(barcode_val):
    item_barcode = frappe.db.get_value("Item Barcode", {"barcode": barcode_val}, "parent")
    
    if not item_barcode:
        frappe.throw(f"No item found for barcode {barcode_val}")
        
    item = frappe.get_doc("Item", item_barcode)
    
    return {
        "item_code": item.item_code,
        "item_name": item.item_name,
        "uom": item.stock_uom,
        "rate": 0
    }
