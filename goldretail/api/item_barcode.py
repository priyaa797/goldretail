import frappe
import random
import string
import barcode
from barcode.writer import ImageWriter
import io

import qrcode

@frappe.whitelist()
def generate_barcode(item_code):
    return _generate_code(item_code, is_qr=False)

@frappe.whitelist()
def generate_qr(item_code):
    return _generate_code(item_code, is_qr=True)

def _generate_code(item_code, is_qr=False):
    item = frappe.get_doc("Item", item_code)
    
    # Check if item already has a barcode
    barcode_val = None
    if item.barcodes:
        barcode_val = item.barcodes[0].barcode
        
    if not barcode_val:
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        barcode_val = f"{item_code}-{suffix}"
        
    rv = io.BytesIO()
    if is_qr:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(barcode_val)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(rv, format='PNG')
        file_name = f"{barcode_val}_qr.png"
    else:
        Code128 = barcode.get_barcode_class('code128')
        Code128(barcode_val, writer=ImageWriter()).write(rv)
        file_name = f"{barcode_val}.png"
        
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": file_name,
        "attached_to_doctype": "Item",
        "attached_to_name": item_code,
        "content": rv.getvalue(),
        "is_private": 0
    })
    file_doc.save(ignore_permissions=True)
    
    if item.barcodes:
        barcode_doc = frappe.get_doc("Item Barcode", item.barcodes[0].name)
        if is_qr:
            barcode_doc.custom_qr_image = file_doc.file_url
        else:
            barcode_doc.custom_barcode_image = file_doc.file_url
        barcode_doc.save(ignore_permissions=True)
    else:
        append_data = {
            "barcode": barcode_val,
            "uom": item.stock_uom or "Nos"
        }
        if is_qr:
            append_data["custom_qr_image"] = file_doc.file_url
        else:
            append_data["custom_barcode_image"] = file_doc.file_url
            
        item.append("barcodes", append_data)
        item.save(ignore_permissions=True)
        
    return barcode_val

@frappe.whitelist()
def get_item_by_barcode(barcode_val):
    item_barcode = frappe.db.get_value("Item Barcode", {"barcode": barcode_val}, "parent")
    
    if not item_barcode:
        frappe.throw(f"No item found for barcode {barcode_val}")
        
    item = frappe.get_doc("Item", item_barcode)
    
    # Fetch tax
    gst_percent = 0.0
    item_tax = frappe.db.get_value('Item Tax', {'parent': item.name}, 'item_tax_template')
    if item_tax:
        templates = frappe.get_all('Item Tax Template Detail', filters={'parent': item_tax}, fields=['tax_type', 'tax_rate'])
        for t in templates:
            if 'IGST' in t.tax_type and 'Refund' not in t.tax_type and 'RCM' not in t.tax_type:
                gst_percent = t.tax_rate
                break
                
    # Fetch packing from UOM Conversion Detail for Carton
    packing = ''
    for uom in item.get('uoms', []):
        if uom.uom == 'Carton':
            packing = uom.conversion_factor
            break
            
    return {
        "item_code": item.item_code,
        "item_name": item.item_name,
        "uom": item.stock_uom,
        "rate": 0,
        "gst_percentage": gst_percent,
        "weight_per_unit": item.weight_per_unit,
        "packing_from_item": packing
    }

@frappe.whitelist()
def get_all_items():
    items = frappe.get_all('Item', fields=['name', 'item_code', 'item_name', 'description', 'standard_rate', 'weight_per_unit'])
    
    # Pre-fetch item taxes to optimize
    item_taxes = frappe.get_all('Item Tax', fields=['parent', 'item_tax_template'])
    tax_map = {}
    for t in item_taxes:
        tax_map[t.parent] = t.item_tax_template
        
    template_rates = {}
    templates = frappe.get_all('Item Tax Template Detail', fields=['parent', 'tax_type', 'tax_rate'])
    for t in templates:
        if 'IGST' in t.tax_type and 'Refund' not in t.tax_type and 'RCM' not in t.tax_type:
            template_rates[t.parent] = t.tax_rate
            
    # Fetch packing from UOM Conversion Detail
    uom_conversions = frappe.get_all('UOM Conversion Detail', filters={'parenttype': 'Item', 'uom': 'Carton'}, fields=['parent', 'conversion_factor'])
    packing_map = {u.parent: u.conversion_factor for u in uom_conversions}
            
    for item in items:
        template = tax_map.get(item.name)
        item['gst_percentage'] = template_rates.get(template, 0.0) if template else 0.0
        item['packing_from_item'] = packing_map.get(item.name, '')
        
    return items

@frappe.whitelist()
def update_item_packings(item_packings):
    import json
    if isinstance(item_packings, str):
        item_packings = json.loads(item_packings)
        
    for data in item_packings:
        item = frappe.get_doc("Item", data.get("item_code"))
        
        # update or add carton uom
        found = False
        for uom in item.uoms:
            if uom.uom == "Carton":
                uom.conversion_factor = float(data.get("packing"))
                found = True
                break
                
        if not found:
            item.append("uoms", {
                "uom": "Carton",
                "conversion_factor": float(data.get("packing"))
            })
            
        item.save(ignore_permissions=True)
    
    return True
