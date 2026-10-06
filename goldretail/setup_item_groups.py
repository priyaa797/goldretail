import frappe
import pandas as pd
import os

def get_file_path(file_name):
    """Fetch file path from Frappe File manager."""
    file_doc_name = frappe.db.get_value("File", {"file_name": file_name}, "name")
    if file_doc_name:
        return frappe.get_doc("File", file_doc_name).get_full_path()
    return None

def execute():
    """
    Reads the Excel files from the system and creates all missing Categories and Sub-categories.
    Run via: bench --site your_site_name execute goldretail.setup_item_groups.execute
    """
    target_files = [
        "final_2909NETT CERAMIC&KITCHEN WARE.xlsx",
        "final_2909NETT GLASSWARE.xlsx"
    ]
    
    existing_categories = set(frappe.get_all("Item Category", pluck="name"))
    existing_subcategories = set(frappe.get_all("Item Sub Category", pluck="name"))
    
    for target_file in target_files:
        file_path = get_file_path(target_file)
        
        if not file_path or not os.path.exists(file_path):
            print(f"File {target_file} not found in the system. Please ensure it's uploaded via File manager with exactly this name.")
            continue
            
        print(f"\nProcessing file: {target_file}")
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            print(f"Error reading file {target_file}: {e}")
            continue
        
        # Track unique categories and sub-categories to create
        categories_to_create = set()
        sub_categories_to_create = set()
        
        for _, row in df.iterrows():
            cat = str(row.get('Category', '')).strip()
            sub_cat = str(row.get('Sub-Category', '')).strip()
            
            if cat and cat.lower() != 'nan':
                categories_to_create.add(cat)
                
            if sub_cat and sub_cat.lower() != 'nan':
                sub_categories_to_create.add(sub_cat)
                
        # 1. Create Main Categories First
        for cat in categories_to_create:
            if cat not in existing_categories:
                print(f"Creating Category: {cat}")
                try:
                    doc = frappe.new_doc("Item Category")
                    # Try setting common naming fields for custom doctypes
                    if hasattr(doc, "category_name"): doc.category_name = cat
                    elif hasattr(doc, "item_category_name"): doc.item_category_name = cat
                    else: doc.name = cat # If standard naming is based on name
                    
                    doc.insert(ignore_permissions=True, ignore_mandatory=True)
                except Exception as e:
                    print(f"Error creating Item Category '{cat}': {e}")
                existing_categories.add(cat)
                
        # 2. Create Sub-Categories
        for sub_cat in sub_categories_to_create:
            if sub_cat not in existing_subcategories:
                print(f"Creating SubCategory: {sub_cat}")
                
                # Find the parent category for this sub_category from the DataFrame
                parent_cat = None
                match = df[df['Sub-Category'].astype(str).str.strip() == sub_cat]
                if not match.empty:
                    potential_parent = str(match.iloc[0]['Category']).strip()
                    if potential_parent and potential_parent.lower() != 'nan':
                        parent_cat = potential_parent
                        
                try:
                    doc = frappe.new_doc("Item Sub Category")
                    if hasattr(doc, "sub_category_name"): doc.sub_category_name = sub_cat
                    elif hasattr(doc, "subcategory_name"): doc.subcategory_name = sub_cat
                    elif hasattr(doc, "item_subcategory_name"): doc.item_subcategory_name = sub_cat
                    else: doc.name = sub_cat
                    
                    # Try to link to parent if field exists
                    if parent_cat:
                        if hasattr(doc, "item_category"): doc.item_category = parent_cat
                        elif hasattr(doc, "category"): doc.category = parent_cat
                        
                    doc.insert(ignore_permissions=True, ignore_mandatory=True)
                except Exception as e:
                    print(f"Error creating Item SubCategory '{sub_cat}': {e}")
                existing_subcategories.add(sub_cat)
                
    frappe.db.commit()
    print("\nSuccessfully processed all files and created missing Item Categories & SubCategories!")
