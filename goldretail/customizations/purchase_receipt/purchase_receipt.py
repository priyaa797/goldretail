import frappe
import random
import string

@frappe.whitelist()
def generate_barcodes(docname):
    pr = frappe.get_doc("Purchase Receipt", docname)
    generated = 0
    
    for item in pr.items:
        # Check if item already has a barcode
        has_barcode = frappe.db.exists("Item Barcode", {"parent": item.item_code})
        if not has_barcode:
            # Generate a simple barcode
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            barcode_val = f"{item.item_code}-{suffix}"
            
            item_doc = frappe.get_doc("Item", item.item_code)
            item_doc.append("barcodes", {
                "barcode": barcode_val,
                "uom": item.uom
            })
            item_doc.save(ignore_permissions=True)
            generated += 1
            
    return generated
