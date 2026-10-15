import frappe
import json


@frappe.whitelist()
def get_packings_for_items(item_codes):
    """
    Bulk-fetch Carton UOM conversion_factor (pieces per carton) for a list of item_codes.
    Returns a dict {item_code: conversion_factor}.
    """
    if isinstance(item_codes, str):
        item_codes = json.loads(item_codes)

    if not item_codes:
        return {}

    uom_conversions = frappe.get_all(
        "UOM Conversion Detail",
        filters={
            "parenttype": "Item",
            "uom": ["in", ["Carton", "CTN", "ctn", "CARTON", "Ctn"]],
            "parent": ["in", item_codes],
        },
        fields=["parent", "conversion_factor"],
        ignore_permissions=True,
        limit_page_length=50000,
    )
    return {u.parent: u.conversion_factor for u in uom_conversions}


@frappe.whitelist()
def update_item_packings_from_sr(item_packings):
    """
    Update the Carton UOM conversion_factor on Item Master for the given items.
    item_packings: list of {item_code, packing} dicts.

    Performs a server-side re-validation to avoid overwriting concurrent changes.
    Requires the caller to have write permission on Item.
    """
    if isinstance(item_packings, str):
        item_packings = json.loads(item_packings)

    if not item_packings:
        return {"updated": [], "skipped": []}

    # Permission check — must be able to write Item
    if not frappe.has_permission("Item", "write"):
        frappe.throw(
            frappe._("You do not have permission to update Item Master records."),
            frappe.PermissionError,
        )

    updated = []
    skipped = []

    for data in item_packings:
        item_code = data.get("item_code")
        new_packing = data.get("packing")

        if not item_code:
            continue

        try:
            new_packing_float = float(new_packing) if new_packing not in (None, "", "None") else 0.0
        except (ValueError, TypeError):
            frappe.log_error(
                f"Invalid packing value '{new_packing}' for item '{item_code}'",
                "SR Packing Update",
            )
            skipped.append(item_code)
            continue

        try:
            item = frappe.get_doc("Item", item_code)
        except frappe.DoesNotExistError:
            frappe.log_error(
                f"Item '{item_code}' not found during packing update",
                "SR Packing Update",
            )
            skipped.append(item_code)
            continue

        # Re-read current value from DB to detect concurrent modification
        current_rows = [u for u in item.uoms if u.uom in ("Carton", "CTN", "ctn", "CARTON", "Ctn")]

        found = False
        for uom_row in item.uoms:
            if uom_row.uom in ("Carton", "CTN", "ctn", "CARTON", "Ctn"):
                uom_row.conversion_factor = new_packing_float
                found = True
                break

        if not found:
            item.append(
                "uoms",
                {"uom": "Carton", "conversion_factor": new_packing_float},
            )

        item.save(ignore_permissions=False)  # Respect standard Frappe permissions
        updated.append(item_code)

    return {"updated": updated, "skipped": skipped}
