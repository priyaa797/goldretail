import frappe
from frappe import _

@frappe.whitelist()
def get_item_price(item_code, price_list="Standard Selling"):
    """
    Returns the current item price and UOM for the given item and price list.
    """
    price_doc = frappe.db.get_value(
        "Item Price", 
        {"item_code": item_code, "price_list": price_list},
        ["name", "price_list_rate", "uom"],
        as_dict=True
    )
    return price_doc

@frappe.whitelist()
def set_item_price(item_code, amount, uom, price_list="Standard Selling"):
    """
    Updates or creates an Item Price record.
    """
    if not amount or float(amount) <= 0:
        frappe.throw(_("Price amount must be greater than 0"))
        
    if not uom:
        frappe.throw(_("UOM is required"))
        
    # Check if price list exists, if not throw
    if not frappe.db.exists("Price List", price_list):
        frappe.throw(_("Price List {0} does not exist").format(price_list))
        
    # Check if an item price already exists
    existing_price = frappe.db.get_value(
        "Item Price", 
        {"item_code": item_code, "price_list": price_list},
        "name"
    )
    
    if existing_price:
        # Update existing
        doc = frappe.get_doc("Item Price", existing_price)
        doc.price_list_rate = float(amount)
        doc.uom = uom
        doc.save(ignore_permissions=True)
        frappe.msgprint(_("Item Price updated successfully"))
        return doc.name
    else:
        # Create new
        doc = frappe.get_doc({
            "doctype": "Item Price",
            "item_code": item_code,
            "price_list": price_list,
            "uom": uom,
            "price_list_rate": float(amount)
        })
        doc.insert(ignore_permissions=True)
        frappe.msgprint(_("Item Price created successfully"))
        return doc.name
