import frappe
import openpyxl
import os
import re
import json
import base64
import io

def get_local_file_path(file_url):
    """Resolve file_url or local file path to absolute path on disk."""
    if not file_url:
        return None
    if os.path.exists(file_url):
        return file_url
    if file_url.startswith("/files/"):
        filename = file_url.replace("/files/", "")
        path = frappe.get_site_path("public", "files", filename)
        if os.path.exists(path):
            return path
    if file_url.startswith("/private/files/"):
        filename = file_url.replace("/private/files/", "")
        path = frappe.get_site_path("private", "files", filename)
        if os.path.exists(path):
            return path
            
    # Try finding File document in Frappe DB
    file_doc_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
    if file_doc_name:
        doc = frappe.get_doc("File", file_doc_name)
        return doc.get_full_path()
        
    return None

def extract_excel_images(ws):
    """Safely extract images from openpyxl worksheet, mapped by 1-indexed row number."""
    image_map = {}
    if hasattr(ws, '_images'):
        for img in ws._images:
            try:
                row_idx = None
                anchor = getattr(img, 'anchor', None)
                if anchor is not None:
                    if hasattr(anchor, '_from') and hasattr(anchor._from, 'row'):
                        row_idx = anchor._from.row + 1  # 0-indexed to 1-indexed
                    elif hasattr(anchor, 'row'):
                        row_idx = anchor.row + 1
                    elif hasattr(anchor, 'cell') and hasattr(anchor.cell, 'row'):
                        row_idx = anchor.cell.row
                
                if row_idx is not None and row_idx not in image_map:
                    image_map[row_idx] = img
            except Exception:
                pass
    return image_map

def get_image_base64(img):
    """Extract raw image bytes from openpyxl image and return as base64 data URI."""
    try:
        raw_bytes = None
        if hasattr(img, '_data') and callable(img._data):
            raw_bytes = img._data()
        elif hasattr(img, '_data'):
            raw_bytes = img._data
        elif hasattr(img, 'ref'):
            img.ref.seek(0)
            raw_bytes = img.ref.read()
            
        if raw_bytes:
            fmt = getattr(img, 'format', 'jpeg') or 'jpeg'
            b64 = base64.b64encode(raw_bytes).decode('utf-8')
            return f"data:image/{fmt.lower()};base64,{b64}"
    except Exception:
        pass
    return None

def get_image_bytes(img):
    """Extract raw bytes from openpyxl image."""
    try:
        if hasattr(img, '_data') and callable(img._data):
            return img._data()
        elif hasattr(img, '_data'):
            return img._data
        elif hasattr(img, 'ref'):
            img.ref.seek(0)
            return img.ref.read()
    except Exception:
        pass
    return None

def detect_column_mapping(ws):
    """
    Detect column headers across the first 3 rows of the worksheet.
    Returns (header_end_row, col_map) where col_map maps column index (1-based) to canonical field:
    'item_code', 'description', 'photo', 'pcs_per_ctn', 'carton_count', 'total_qty', 'category', 'sub_category'
    """
    col_map = {}
    header_end_row = 1
    
    # Check rows 1 and 2
    row1 = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
    row2 = [ws.cell(2, c).value for c in range(1, ws.max_column + 1)]
    
    # Check if row 2 is a sub-header row (e.g. row 2 col 1 is None/empty and row 2 has subheaders like pcs/ctn, ctn, pcs)
    has_two_row_headers = False
    row2_col1 = ws.cell(2, 1).value
    if (row2_col1 is None or str(row2_col1).strip() == '') and ws.max_row >= 2:
        for c in range(1, ws.max_column + 1):
            v2 = str(row2[c - 1] or '').strip().lower()
            if v2 in ['pcs/ctn', 'pcs / ctn', 'ctn', 'pcs', 'packing'] or ('pcs' in v2 and 'ctn' in v2):
                has_two_row_headers = True
                break
            
    if has_two_row_headers:
        header_end_row = 2
        for c in range(1, ws.max_column + 1):
            v1 = str(row1[c - 1] or '').strip().lower()
            v2 = str(row2[c - 1] or '').strip().lower()
            combined = f"{v1} {v2}".strip()
            
            if any(k in v1 for k in ['item no', 'item_no', 'item code', 'item_code']) or 'item no' in combined:
                col_map[c] = 'item_code'
            elif any(k in v1 for k in ['description', 'goods', 'item name', 'name']) or 'description' in combined:
                col_map[c] = 'description'
            elif any(k in v1 for k in ['photo', 'image', 'picture', 'pic']):
                col_map[c] = 'photo'
            elif ('pcs' in v2 and 'ctn' in v2) or 'pcs/ctn' in combined or 'pcs / ctn' in combined:
                col_map[c] = 'pcs_per_ctn'
            elif v2 == 'ctn' or 'carton' in v2 or 'ctn' in combined:
                col_map[c] = 'carton_count'
            elif v2 == 'pcs' or 'total' in v1 or 'total pcs' in combined:
                col_map[c] = 'total_qty'
            elif 'category' in combined and 'sub' not in combined:
                col_map[c] = 'category'
            elif 'sub' in combined and 'category' in combined:
                col_map[c] = 'sub_category'
    else:
        header_end_row = 1
        for c in range(1, ws.max_column + 1):
            val = str(row1[c - 1] or '').strip().lower()
            if any(k in val for k in ['item no', 'item_no', 'item code', 'item_code']):
                col_map[c] = 'item_code'
            elif any(k in val for k in ['description', 'goods', 'item name', 'name']):
                col_map[c] = 'description'
            elif any(k in val for k in ['photo', 'image', 'picture', 'pic']):
                col_map[c] = 'photo'
            elif any(k in val for k in ['pcs/ctn', 'pcs / ctn', 'pcs_per_ctn', 'packing', 'pieces per carton']):
                col_map[c] = 'pcs_per_ctn'
            elif any(k in val for k in ['ctn', 'carton', 'cartons', 'carton count']):
                col_map[c] = 'carton_count'
            elif any(k in val for k in ['total', 'total pcs', 'total qty', 'total quantity', 'qty']):
                col_map[c] = 'total_qty'
            elif 'category' in val and 'sub' not in val:
                col_map[c] = 'category'
            elif 'sub' in val and 'category' in val:
                col_map[c] = 'sub_category'

    return header_end_row, col_map

@frappe.whitelist()
def validate_purchase_excel(file_url=None):
    """
    Validates an uploaded Excel workbook for Purchase Import.
    Maps actual workbook columns, validates quantities and consistency,
    checks against Item master, and classifies each row into:
    - existing_match: Existing item, carton qty matches
    - existing_mismatch: Existing item, carton qty differs
    - new_item: Missing item, needs to be created
    - invalid: Row has errors (e.g. missing code, invalid quantity, math mismatch, duplicate code)
    """
    if not file_url and 'file' in frappe.request.files:
        # Save uploaded file
        file_obj = frappe.request.files['file']
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": file_obj.filename,
            "content": file_obj.read(),
            "is_private": 0
        })
        file_doc.save(ignore_permissions=True)
        file_url = file_doc.file_url

    if not file_url:
        frappe.throw("No file provided for Excel import.")

    file_path = get_local_file_path(file_url)
    if not file_path or not os.path.exists(file_path):
        frappe.throw(f"Unable to locate file on server: {file_url}")

    if not file_path.lower().endswith(('.xlsx', '.xlsm')):
        frappe.throw("Invalid file format. Please upload an Excel file (.xlsx).")

    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
    except Exception as e:
        frappe.throw(f"Failed to open Excel workbook: {str(e)}")

    if not wb.sheetnames:
        frappe.throw("The uploaded Excel workbook contains no sheets.")

    ws = wb.active
    header_end_row, col_map = detect_column_mapping(ws)

    # Validate required columns
    inv_map = {v: k for k, v in col_map.items()}
    if 'item_code' not in inv_map:
        frappe.throw("Workbook is missing required column: Item Code / Item No. (ITEM NO.).")
    if 'pcs_per_ctn' not in inv_map:
        frappe.throw("Workbook is missing required column: Pieces per Carton (PCS/CTN).")

    # Extract embedded images
    image_map = extract_excel_images(ws)

    # Pre-fetch existing Categories and Subcategories
    existing_categories = set(frappe.get_all("Item Category", pluck="name"))
    existing_subcategories = set(frappe.get_all("Item Sub Category", pluck="name"))

    rows_data = []
    seen_item_codes = {}
    
    for r in range(header_end_row + 1, ws.max_row + 1):
        # Extract row values
        raw_vals = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
        
        # Check if entire row is empty
        if not any(v is not None and str(v).strip() != '' for v in raw_vals):
            continue
            
        code_val = ws.cell(r, inv_map['item_code']).value if 'item_code' in inv_map else None
        code_str = str(code_val).strip() if code_val is not None else ''
        
        # Check for footer / summary rows
        if code_str.upper().startswith(('TOTAL', 'REMARK', 'SHIPPING MARK', 'NOTE', 'TERMS')):
            continue
            
        desc_val = ws.cell(r, inv_map['description']).value if 'description' in inv_map else ''
        desc_str = str(desc_val).strip() if desc_val is not None else ''
        
        pcs_ctn_val = ws.cell(r, inv_map['pcs_per_ctn']).value if 'pcs_per_ctn' in inv_map else None
        carton_val = ws.cell(r, inv_map['carton_count']).value if 'carton_count' in inv_map else None
        total_qty_val = ws.cell(r, inv_map['total_qty']).value if 'total_qty' in inv_map else None
        
        category_val = ws.cell(r, inv_map['category']).value if 'category' in inv_map else None
        category_str = str(category_val).strip() if category_val is not None else ''
        
        sub_cat_val = ws.cell(r, inv_map['sub_category']).value if 'sub_category' in inv_map else None
        sub_cat_str = str(sub_cat_val).strip() if sub_cat_val is not None else ''
        
        # Extract image if present
        img_obj = image_map.get(r)
        image_preview = get_image_base64(img_obj) if img_obj else None

        row_info = {
            'row_num': r,
            'item_code': code_str,
            'item_name': desc_str[:60] if desc_str else code_str,
            'description': desc_str,
            'category': category_str,
            'sub_category': sub_cat_str,
            'excel_pcs_ctn': pcs_ctn_val,
            'carton_count': carton_val,
            'total_qty': total_qty_val,
            'has_image': bool(image_preview),
            'image_preview': image_preview,
            'status': 'valid',
            'errors': []
        }

        # Validation 1: Required Item Code
        if not code_str:
            row_info['status'] = 'invalid'
            row_info['errors'].append("Missing Item Code (ITEM NO.).")
            rows_data.append(row_info)
            continue

        # Validation 2: Duplicate Item Code within spreadsheet
        if code_str in seen_item_codes:
            row_info['status'] = 'invalid'
            row_info['errors'].append(f"Duplicate Item Code '{code_str}' in spreadsheet (previously in Row {seen_item_codes[code_str]}).")
            rows_data.append(row_info)
            continue
        seen_item_codes[code_str] = r

        # Validation 3: Pieces per Carton numeric validation
        pcs_ctn = None
        try:
            if pcs_ctn_val is None or str(pcs_ctn_val).strip() == '':
                raise ValueError("Pieces per carton is required")
            pcs_ctn = float(pcs_ctn_val)
            if pcs_ctn <= 0:
                raise ValueError("Must be greater than 0")
            row_info['excel_pcs_ctn'] = pcs_ctn
        except Exception:
            row_info['status'] = 'invalid'
            row_info['errors'].append(f"Invalid Pieces per Carton '{pcs_ctn_val}'. Must be a positive number.")

        # Validation 4: Carton Count & Total Quantity
        carton_count = None
        if carton_val is not None and str(carton_val).strip() != '':
            try:
                carton_count = float(carton_val)
                if carton_count < 0:
                    raise ValueError("Cannot be negative")
                row_info['carton_count'] = carton_count
            except Exception:
                row_info['status'] = 'invalid'
                row_info['errors'].append(f"Invalid Carton count '{carton_val}'.")

        total_qty = None
        if total_qty_val is not None and str(total_qty_val).strip() != '':
            try:
                total_qty = float(total_qty_val)
                if total_qty < 0:
                    raise ValueError("Cannot be negative")
                row_info['total_qty'] = total_qty
            except Exception:
                row_info['status'] = 'invalid'
                row_info['errors'].append(f"Invalid Total Quantity '{total_qty_val}'.")

        # Quantity consistency check: Total Quantity = Carton Count * Pieces per Carton
        if pcs_ctn is not None and pcs_ctn > 0:
            if carton_count is not None and total_qty is not None:
                calc_total = carton_count * pcs_ctn
                if abs(calc_total - total_qty) > 0.001:
                    row_info['status'] = 'invalid'
                    row_info['errors'].append(
                        f"Quantity mismatch: {carton_count} CTN × {pcs_ctn} PCS/CTN = {calc_total:g}, but spreadsheet total is {total_qty:g}."
                    )
            elif carton_count is not None and total_qty is None:
                total_qty = carton_count * pcs_ctn
                row_info['total_qty'] = total_qty
            elif total_qty is not None and carton_count is None:
                carton_count = total_qty / pcs_ctn
                row_info['carton_count'] = carton_count
            elif carton_count is None and total_qty is None:
                carton_count = 1.0
                total_qty = pcs_ctn
                row_info['carton_count'] = carton_count
                row_info['total_qty'] = total_qty

        # Category / Subcategory validation against DB
        if category_str and category_str not in existing_categories:
            row_info['category_warning'] = f"Category '{category_str}' does not exist in master."
        if sub_cat_str and sub_cat_str not in existing_subcategories:
            row_info['sub_category_warning'] = f"Subcategory '{sub_cat_str}' does not exist in master."

        rows_data.append(row_info)

    if not rows_data:
        frappe.throw("No data rows found in the uploaded spreadsheet.")

    # Step 2: Check each item against Item master in Frappe DB
    valid_codes = [r['item_code'] for r in rows_data if r['status'] != 'invalid']
    existing_items_dict = {}
    if valid_codes:
        item_records = frappe.db.sql("""
            SELECT item_code, item_name, description, category, sub_category, image
            FROM tabItem
            WHERE item_code IN %s
        """, (tuple(valid_codes),), as_dict=True)
        for itm in item_records:
            existing_items_dict[itm.item_code] = itm

        # Get UOM Carton conversion factors
        if existing_items_dict:
            uom_conversions = frappe.db.sql("""
                SELECT parent, conversion_factor
                FROM `tabUOM Conversion Detail`
                WHERE parent IN %s AND uom = 'Carton'
            """, (tuple(existing_items_dict.keys()),), as_dict=True)
            for uc in uom_conversions:
                existing_items_dict[uc.parent]['carton_packing'] = uc.conversion_factor

    # Classify rows
    for r in rows_data:
        if r['status'] == 'invalid':
            continue

        code = r['item_code']
        if code in existing_items_dict:
            db_item = existing_items_dict[code]
            db_carton = db_item.get('carton_packing')
            r['item_name'] = db_item.get('item_name') or r['item_name']
            r['db_carton_qty'] = db_carton
            r['category'] = db_item.get('category') or r['category']
            r['sub_category'] = db_item.get('sub_category') or r['sub_category']
            
            # Compare carton quantities (normalized numeric comparison)
            excel_carton = r['excel_pcs_ctn']
            if db_carton is not None and abs(float(db_carton) - float(excel_carton)) < 0.0001:
                r['status'] = 'existing_match'
            else:
                r['status'] = 'existing_mismatch'
        else:
            r['status'] = 'new_item'

    summary = {
        'total_rows': len(rows_data),
        'existing_match': sum(1 for r in rows_data if r['status'] == 'existing_match'),
        'existing_mismatch': sum(1 for r in rows_data if r['status'] == 'existing_mismatch'),
        'new_items': sum(1 for r in rows_data if r['status'] == 'new_item'),
        'invalid': sum(1 for r in rows_data if r['status'] == 'invalid'),
    }

    return {
        'summary': summary,
        'rows': rows_data,
        'file_url': file_url
    }

@frappe.whitelist()
def create_missing_items(items):
    """
    Creates missing Item master records from user-reviewed list.
    Enforces permissions, prevents duplicate creation, attaches images,
    and returns created and failed items.
    """
    frappe.only_for(["System Manager", "Item Manager", "Stock Manager"])

    if isinstance(items, str):
        items = json.loads(items)

    if not items:
        frappe.throw("No items provided for creation.")

    created = []
    failed = []

    for item_data in items:
        item_code = str(item_data.get('item_code', '')).strip()
        item_name = str(item_data.get('item_name', '')).strip() or item_code
        pcs_per_ctn = item_data.get('pcs_per_ctn') or item_data.get('excel_pcs_ctn')
        category = item_data.get('category')
        sub_category = item_data.get('sub_category')
        description = item_data.get('description')
        image_base64_str = item_data.get('image_preview')

        if not item_code:
            failed.append({'item_code': item_code, 'error': 'Item code is missing.'})
            continue

        # Check if item was created in the meantime by another user
        if frappe.db.exists('Item', item_code):
            failed.append({'item_code': item_code, 'error': f"Item '{item_code}' already exists in database."})
            continue

        try:
            # Prepare Item doc
            item_doc_dict = {
                "doctype": "Item",
                "item_code": item_code,
                "item_name": item_name,
                "item_group": "Products",
                "description": description,
                "stock_uom": "Nos",
                "is_stock_item": 1,
                "gst_hsn_code": "999999",
                "uoms": [
                    {"uom": "Nos", "conversion_factor": 1}
                ]
            }

            if category and frappe.db.exists('Item Category', category):
                item_doc_dict['category'] = category
            if sub_category and frappe.db.exists('Item Sub Category', sub_category):
                item_doc_dict['sub_category'] = sub_category

            if pcs_per_ctn and float(pcs_per_ctn) > 0:
                item_doc_dict['uoms'].append({
                    "uom": "Carton",
                    "conversion_factor": float(pcs_per_ctn)
                })

            item_doc = frappe.get_doc(item_doc_dict)
            item_doc.insert()

            # Handle Image attachment if present
            if image_base64_str and ',' in image_base64_str:
                try:
                    header, encoded = image_base64_str.split(',', 1)
                    raw_data = base64.b64decode(encoded)
                    ext = "jpg"
                    if 'image/png' in header:
                        ext = "png"
                    elif 'image/jpeg' in header or 'image/jpg' in header:
                        ext = "jpg"

                    file_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": f"{item_code}_img.{ext}",
                        "attached_to_doctype": "Item",
                        "attached_to_name": item_code,
                        "content": raw_data,
                        "is_private": 0
                    })
                    file_doc.insert(ignore_permissions=True)
                    frappe.db.set_value("Item", item_code, "image", file_doc.file_url)
                except Exception as img_err:
                    frappe.log_error(f"Image attachment error for {item_code}: {str(img_err)}")

            created.append({
                'item_code': item_code,
                'item_name': item_name,
                'pcs_per_ctn': pcs_per_ctn
            })

        except Exception as e:
            frappe.db.rollback()
            failed.append({'item_code': item_code, 'error': str(e)})

    frappe.db.commit()
    return {
        'success': True,
        'created': created,
        'failed': failed
    }

@frappe.whitelist()
def update_item_carton_qty(item_code, new_carton_qty):
    """
    Updates the Item Master's Carton UOM conversion factor.
    Explicitly enforces permissions and ensures clean transaction handling,
    updating only the carton-quantity field without touching unrelated Item fields.
    """
    frappe.only_for(["System Manager", "Item Manager", "Stock Manager"])

    if not item_code or not frappe.db.exists("Item", item_code):
        frappe.throw(f"Item '{item_code}' not found.")

    try:
        qty = float(new_carton_qty)
        if qty <= 0:
            frappe.throw("Carton quantity must be greater than 0.")
    except (ValueError, TypeError):
        frappe.throw(f"Invalid carton quantity '{new_carton_qty}'.")

    # Update only the Carton UOM conversion factor directly
    existing_uom = frappe.db.get_value(
        "UOM Conversion Detail",
        {"parent": item_code, "uom": "Carton"},
        ["name", "conversion_factor"],
        as_dict=True
    )
    if existing_uom:
        frappe.db.set_value("UOM Conversion Detail", existing_uom.name, "conversion_factor", qty)
    else:
        uom_doc = frappe.get_doc({
            "doctype": "UOM Conversion Detail",
            "parent": item_code,
            "parenttype": "Item",
            "parentfield": "uoms",
            "uom": "Carton",
            "conversion_factor": qty
        })
        uom_doc.insert(ignore_permissions=True)

    frappe.db.commit()
    return {
        "success": True,
        "item_code": item_code,
        "new_carton_qty": qty
    }
