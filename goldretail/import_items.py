import frappe
import pandas as pd
import re
import os

def get_mapped_fields():
    """Find the exact mapping fields for category and sub_category in the Item doctype."""
    meta = frappe.get_meta("Item")
    fields = [f.fieldname for f in meta.fields]
    category_field = None
    sub_category_field = None
    
    for f in fields:
        if 'sub_category' in f or 'sub_group' in f or 'subcategory' in f:
            sub_category_field = f
        elif 'category' in f and 'sub' not in f and 'item_group' not in f:
            category_field = f
            
    # Default fallbacks if custom fields aren't intuitively named
    category_field = 'item_category'
    sub_category_field = 'item_subcategory'
            
    return category_field, sub_category_field

def is_nan(val):
    if pd.isna(val): return True
    if isinstance(val, str) and val.lower().strip() == 'nan': return True
    return False

def extract_carton_qty(uom_raw):
    """Extracts numeric quantity from a UOM string like '1 set in ctn'."""
    if not uom_raw: return None
    match = re.search(r'(\d+)', uom_raw.lower())
    if match: return float(match.group(1))
    return None

def get_file_path(file_name):
    """Fetch file path from Frappe File manager."""
    file_doc_name = frappe.db.get_value("File", {"file_name": file_name}, "name")
    if file_doc_name:
        return frappe.get_doc("File", file_doc_name).get_full_path()
    return None

def setup_dependencies():
    """Ensure UOMs and Price Lists exist before importing."""
    # Ensure UOMs
    uoms = frappe.get_all("UOM", pluck="name")
    if "Nos" not in uoms:
        print("Creating default UOM 'Nos'")
        frappe.get_doc({"doctype": "UOM", "uom_name": "Nos", "must_be_whole_number": 1}).insert(ignore_permissions=True)
    if "Carton" not in uoms:
        print("Creating UOM 'Carton'")
        frappe.get_doc({"doctype": "UOM", "uom_name": "Carton", "must_be_whole_number": 1}).insert(ignore_permissions=True)
        
    # Ensure Price Lists
    price_lists = frappe.get_all("Price List", pluck="name")
    if "Standard Buying" not in price_lists:
        print("Creating Price List 'Standard Buying'")
        frappe.get_doc({"doctype": "Price List", "price_list_name": "Standard Buying", "buying": 1, "selling": 0}).insert(ignore_permissions=True)
    if "Standard Selling" not in price_lists:
        print("Creating Price List 'Standard Selling'")
        frappe.get_doc({"doctype": "Price List", "price_list_name": "Standard Selling", "buying": 0, "selling": 1}).insert(ignore_permissions=True)
        
    frappe.db.commit()

def execute(commit=1):
    """
    Run item import for both uploaded Excel files.
    """
    target_files = [
        "final_2909NETT CERAMIC&KITCHEN WARE.xlsx",
        "final_2909NETT GLASSWARE.xlsx"
    ]
    
    # 1. Setup pre-requisites
    setup_dependencies()
    
    category_field, sub_category_field = get_mapped_fields()
    
    # Pre-fetch existing data for fast validation
    existing_items = set(frappe.get_all("Item", pluck="name"))
    
    existing_categories = set(frappe.get_all("Item Category", pluck="name"))
    existing_subcategories = set(frappe.get_all("Item Sub Category", pluck="name"))
    
    wholesale_price_list = "Standard Buying"
    retail_price_list = "Standard Selling"
    
    all_items_to_create = []
    items_in_file = set()
    global_issues = []

    for target_file in target_files:
        file_path = get_file_path(target_file)
        
        if not file_path or not os.path.exists(file_path):
            global_issues.append(f"ERROR: File {target_file} not found in the system. Please upload it via the File manager.")
            continue
            
        print(f"\nReading excel file: {target_file}")
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            global_issues.append(f"Error reading file {target_file}: {e}")
            continue

        for index, row in df.iterrows():
            row_num = index + 2
            item_code = str(row.get('Item code', '')).strip()
            item_name = str(row.get('Item Name', '')).strip()
            description = str(row.get('Description', '')).strip() if not is_nan(row.get('Description')) else None
            category = str(row.get('Category', '')).strip() if not is_nan(row.get('Category')) else None
            sub_category = str(row.get('Sub-Category', '')).strip() if not is_nan(row.get('Sub-Category')) else None
            uom_raw = str(row.get('UOM', '')).strip() if not is_nan(row.get('UOM')) else None
            
            wholesale_price_raw = str(row.get('Wholesale Price', '')).strip() if not is_nan(row.get('Wholesale Price')) else None
            retail_price_raw = str(row.get('Retail Price', '')).strip() if not is_nan(row.get('Retail Price')) else None
            
            if not item_code or is_nan(item_code):
                continue
                
            # Handle Duplicate Item Codes by incrementing
            original_item_code = item_code
            counter = 1
            while item_code in items_in_file or item_code in existing_items:
                item_code = f"{original_item_code}-{counter}"
                counter += 1
                
            if item_code != original_item_code:
                print(f"[{target_file}] Row {row_num}: Duplicate Item Code '{original_item_code}' renamed to '{item_code}'.")

            items_in_file.add(item_code)
            
            # Validation
            if category and category not in existing_categories:
                global_issues.append(f"[{target_file}] Row {row_num}: Category '{category}' not found in Item Category")

            if sub_category and sub_category not in existing_subcategories:
                global_issues.append(f"[{target_file}] Row {row_num}: Sub-Category '{sub_category}' not found in Item SubCategory")

            carton_qty = extract_carton_qty(uom_raw)

            # Pricing
            wholesale_price, retail_price = 0, 0
            if wholesale_price_raw:
                price_match = re.search(r'[\d\.]+', wholesale_price_raw)
                if price_match: wholesale_price = float(price_match.group())
            
            if retail_price_raw:
                price_match = re.search(r'[\d\.]+', retail_price_raw)
                if price_match: retail_price = float(price_match.group())

            # Prepare Doc
            item_doc = {
                "doctype": "Item",
                "item_code": item_code,
                "item_name": item_name,
                "description": description,
                "stock_uom": "Nos",
                "uoms": [],
                "gst_hsn_code": "999999",
                "item_group": "Products",
                "is_stock_item": 1,
                "category": category,
                "sub_category": sub_category
            }
            
            # Use custom fields mapping
            item_doc[category_field] = category
            item_doc[sub_category_field] = sub_category
                
            if carton_qty:
                item_doc["uoms"].append({
                    "uom": "Carton",
                    "conversion_factor": carton_qty
                })
                
            all_items_to_create.append({
                "file": target_file,
                "item": item_doc,
                "prices": {
                    wholesale_price_list: wholesale_price,
                    retail_price_list: retail_price
                },
                "row_num": row_num
            })

    if global_issues:
        print(f"\nCRITICAL ISSUES PREVENTING IMPORT:")
        for issue in global_issues:
            print(issue)
        print("\nPlease fix these global requirements before importing.")
        return
            
    # ACTUAL IMPORT LOGIC
    if commit and all_items_to_create:
        print(f"\nStarting actual import for {len(all_items_to_create)} items...")
        for data in all_items_to_create:
            item_code = data["item"]["item_code"]
            try:
                item = frappe.get_doc(data["item"])
                item.insert(ignore_permissions=True)
                
                # Insert Pricing
                if data["prices"].get(wholesale_price_list):
                    frappe.get_doc({
                        "doctype": "Item Price",
                        "price_list": wholesale_price_list,
                        "item_code": item_code,
                        "price_list_rate": data["prices"][wholesale_price_list]
                    }).insert(ignore_permissions=True)
                    
                if data["prices"].get(retail_price_list):
                    frappe.get_doc({
                        "doctype": "Item Price",
                        "price_list": retail_price_list,
                        "item_code": item_code,
                        "price_list_rate": data["prices"][retail_price_list]
                    }).insert(ignore_permissions=True)
                    
            except Exception as e:
                frappe.log_error(f"Error importing row {data['row_num']} in {data['file']} - {item_code}")
                print(f"Failed to import Row {data['row_num']} ({item_code}) from {data['file']}: {str(e)}")
        
        frappe.db.commit()
        print("\nImport completed successfully.")
