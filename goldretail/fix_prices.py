import frappe

def execute():
    # 1. Ensure the new Price Lists exist and are set up correctly
    price_lists = frappe.get_all("Price List", pluck="name")
    
    if "Wholesale" not in price_lists:
        print("Creating 'Wholesale' Price List...")
        frappe.get_doc({"doctype": "Price List", "price_list_name": "Wholesale", "buying": 0, "selling": 1}).insert(ignore_permissions=True)
    else:
        # Update existing to be selling=1
        frappe.db.set_value("Price List", "Wholesale", {"buying": 0, "selling": 1})
        
    if "Retail" not in price_lists:
        print("Creating 'Retail' Price List...")
        frappe.get_doc({"doctype": "Price List", "price_list_name": "Retail", "buying": 0, "selling": 1}).insert(ignore_permissions=True)
    else:
        # Update existing to be selling=1
        frappe.db.set_value("Price List", "Retail", {"buying": 0, "selling": 1})
        
    # 2. Update existing Item Prices
    buying_prices = frappe.get_all("Item Price", filters={"price_list": "Standard Buying"})
    print(f"Updating {len(buying_prices)} items from 'Standard Buying' to 'Wholesale'...")
    for p in buying_prices:
        frappe.db.set_value("Item Price", p.name, "price_list", "Wholesale")
        
    selling_prices = frappe.get_all("Item Price", filters={"price_list": "Standard Selling"})
    print(f"Updating {len(selling_prices)} items from 'Standard Selling' to 'Retail'...")
    for p in selling_prices:
        frappe.db.set_value("Item Price", p.name, "price_list", "Retail")
        
    frappe.db.commit()
    print("Done! All prices have been successfully moved to the new Price Lists.")
