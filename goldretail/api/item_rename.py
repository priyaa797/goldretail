import os
import openpyxl
import frappe
from frappe import _

@frappe.whitelist()
def rename_items_from_excel(file_path=None, dry_run=False, merge_conflicts=False):
    """
    Rename items based on an Excel file.
    First column: Existing Item Code / Name
    Second column: New Item Code / Name

    Args:
        file_path (str, optional): Absolute path, site file URL, or relative path to the Excel file (.xlsx).
                                   Defaults to 'Item replace2.xlsx' in the goldretail app directory.
        dry_run (bool): If True, validates all rows and reports what would be renamed without committing changes.
        merge_conflicts (bool): If True, merges the old item into the existing new item when both exist. Default False.

    Returns:
        dict: Execution summary with counts and itemized lists of:
              - renamed: Items successfully renamed
              - already_renamed: Items where the new code already exists and old code does not
              - conflicts: Items where BOTH old and new codes exist in the database
              - not_found: Items where neither old nor new code exists
              - identical: Rows where old and new codes are the same
              - errors: Rows that failed during rename
    """
    # Normalize boolean arguments from string if called via HTTP/REST
    if isinstance(dry_run, str):
        dry_run = dry_run.lower() in ("true", "1", "yes")
    if isinstance(merge_conflicts, str):
        merge_conflicts = merge_conflicts.lower() in ("true", "1", "yes")

    # Resolve file path
    resolved_path = resolve_excel_path(file_path)
    if not os.path.exists(resolved_path):
        frappe.throw(_("Excel file not found at: {0}").format(resolved_path))

    wb = openpyxl.load_workbook(resolved_path, data_only=True)
    sheet = wb.active

    results = {
        "file_path": resolved_path,
        "dry_run": dry_run,
        "total_rows_scanned": 0,
        "renamed_count": 0,
        "renamed": [],
        "already_renamed_count": 0,
        "already_renamed": [],
        "conflicts_count": 0,
        "conflicts": [],
        "not_found_count": 0,
        "not_found": [],
        "identical_count": 0,
        "identical": [],
        "error_count": 0,
        "errors": []
    }

    print(f"[{'DRY RUN' if dry_run else 'EXECUTING'}] Processing item renames from: {resolved_path}")

    # Process each row
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
        if not row or (row[0] is None and (len(row) < 2 or row[1] is None)):
            continue

        raw_old = row[0]
        raw_new = row[1] if len(row) > 1 else None

        # Check for header row
        if row_idx == 1:
            val0 = str(raw_old or "").strip().lower()
            val1 = str(raw_new or "").strip().lower()
            if "item" in val0 or "code" in val0 or "name" in val0 or "rename" in val1:
                continue

        if raw_old is None or raw_new is None:
            continue

        old_code = str(raw_old).strip()
        new_code = str(raw_new).strip()

        if not old_code or not new_code:
            continue

        results["total_rows_scanned"] += 1

        if old_code == new_code:
            results["identical_count"] += 1
            results["identical"].append({"row": row_idx, "code": old_code})
            continue

        old_exists = frappe.db.exists("Item", old_code)
        new_exists = frappe.db.exists("Item", new_code)

        # Case 1: Old exists and New does NOT exist -> Perform rename
        if old_exists and not new_exists:
            if dry_run:
                results["renamed_count"] += 1
                results["renamed"].append({"row": row_idx, "old_code": old_code, "new_code": new_code})
            else:
                try:
                    frappe.rename_doc(
                        "Item",
                        old_code,
                        new_code,
                        force=True,
                        merge=False,
                        show_alert=False,
                        rebuild_search=False
                    )
                    frappe.db.commit()
                    results["renamed_count"] += 1
                    results["renamed"].append({"row": row_idx, "old_code": old_code, "new_code": new_code})
                    print(f"  [✓] Row {row_idx}: Renamed '{old_code}' -> '{new_code}'")
                except Exception as e:
                    frappe.db.rollback()
                    err_msg = str(e)
                    results["error_count"] += 1
                    results["errors"].append({"row": row_idx, "old_code": old_code, "new_code": new_code, "error": err_msg})
                    print(f"  [✗] Row {row_idx}: Failed to rename '{old_code}' -> '{new_code}': {err_msg}")

        # Case 2: New exists and Old does NOT exist -> Already renamed
        elif not old_exists and new_exists:
            results["already_renamed_count"] += 1
            results["already_renamed"].append({"row": row_idx, "old_code": old_code, "new_code": new_code})

        # Case 3: Both exist -> Conflict
        elif old_exists and new_exists:
            if merge_conflicts and not dry_run:
                try:
                    frappe.rename_doc(
                        "Item",
                        old_code,
                        new_code,
                        force=True,
                        merge=True,
                        show_alert=False,
                        rebuild_search=False
                    )
                    frappe.db.commit()
                    results["renamed_count"] += 1
                    results["renamed"].append({"row": row_idx, "old_code": old_code, "new_code": new_code, "merged": True})
                    print(f"  [✓] Row {row_idx}: Merged '{old_code}' into '{new_code}'")
                except Exception as e:
                    frappe.db.rollback()
                    err_msg = str(e)
                    results["error_count"] += 1
                    results["errors"].append({"row": row_idx, "old_code": old_code, "new_code": new_code, "error": err_msg})
                    print(f"  [✗] Row {row_idx}: Failed to merge '{old_code}' into '{new_code}': {err_msg}")
            else:
                results["conflicts_count"] += 1
                results["conflicts"].append({
                    "row": row_idx,
                    "old_code": old_code,
                    "new_code": new_code,
                    "reason": "Both items exist in database"
                })

        # Case 4: Neither exists in DB
        else:
            results["not_found_count"] += 1
            results["not_found"].append({"row": row_idx, "old_code": old_code, "new_code": new_code})

    # Trigger global search rebuild once at the end if actual renames took place
    if not dry_run and results["renamed_count"] > 0:
        try:
            frappe.enqueue("frappe.utils.global_search.rebuild_for_doctype", doctype="Item")
        except Exception:
            pass

    print("\n=== Rename Summary ===")
    print(f"Total rows scanned:   {results['total_rows_scanned']}")
    print(f"Successfully renamed: {results['renamed_count']}")
    print(f"Already renamed:      {results['already_renamed_count']}")
    print(f"Conflicts (skipped):  {results['conflicts_count']}")
    print(f"Not found in DB:      {results['not_found_count']}")
    print(f"Errors encountered:   {results['error_count']}")

    return results

def resolve_excel_path(file_path):
    """Resolve file path to an absolute disk path."""
    if not file_path:
        # Default file in goldretail app root
        app_dir = os.path.abspath(os.path.join(frappe.get_app_path("goldretail"), ".."))
        candidate = os.path.join(app_dir, "Item replace2.xlsx")
        if os.path.exists(candidate):
            return candidate
        fallback = "/home/prabhudev797/frappe-bench/apps/goldretail/Item replace2.xlsx"
        if os.path.exists(fallback):
            return fallback
        return candidate

    if os.path.exists(file_path):
        return os.path.abspath(file_path)

    if file_path.startswith("/files/"):
        candidate = frappe.get_site_path("public", "files", file_path.replace("/files/", ""))
        if os.path.exists(candidate):
            return candidate

    if file_path.startswith("/private/files/"):
        candidate = frappe.get_site_path("private", "files", file_path.replace("/private/files/", ""))
        if os.path.exists(candidate):
            return candidate

    # Try site-relative
    site_path = frappe.get_site_path(file_path)
    if os.path.exists(site_path):
        return site_path

    return os.path.abspath(file_path)
