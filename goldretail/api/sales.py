import json
import frappe
from frappe import _

@frappe.whitelist()
def save_sales_invoice(doc):
    """
    Saves a Sales Invoice (creates new draft or updates existing draft).
    """
    if isinstance(doc, str):
        doc = json.loads(doc)

    name = doc.get("name")
    amended_from = doc.get("amended_from")

    if amended_from and frappe.db.exists("Sales Invoice", amended_from):
        orig = frappe.get_doc("Sales Invoice", amended_from)
        if orig.docstatus == 1:
            orig.cancel()

        doc_dict = dict(doc)
        doc_dict.pop("name", None)
        doc_dict["doctype"] = "Sales Invoice"
        doc_dict["amended_from"] = amended_from
        doc_dict["docstatus"] = 0
        doc_dict["update_stock"] = 1
        new_si = frappe.get_doc(doc_dict)
        new_si.insert()
        return new_si.as_dict()

    elif name and frappe.db.exists("Sales Invoice", name):
        si = frappe.get_doc("Sales Invoice", name)
        if si.docstatus == 1:
            orig = si
            orig.cancel()
            doc_dict = dict(doc)
            doc_dict.pop("name", None)
            doc_dict["doctype"] = "Sales Invoice"
            doc_dict["amended_from"] = orig.name
            doc_dict["docstatus"] = 0
            doc_dict["update_stock"] = 1
            new_si = frappe.get_doc(doc_dict)
            new_si.insert()
            return new_si.as_dict()
        elif si.docstatus == 2:
            frappe.throw(_("Cannot edit a cancelled Sales Invoice."))
        else:
            si.customer = doc.get("customer")
            si.selling_price_list = doc.get("selling_price_list") or "Wholesale"
            si.driver_name = (doc.get("driver_name") or "").strip()
            si.vehicle_no = (doc.get("vehicle_no") or "").strip()
            si.update_stock = 1

            # Replace items
            si.set("items", [])
            for item in doc.get("items", []):
                si.append("items", item)

            # Replace taxes
            if "taxes" in doc:
                si.set("taxes", [])
                for tax in doc.get("taxes", []):
                    si.append("taxes", tax)
            if "taxes_and_charges" in doc:
                si.taxes_and_charges = doc.get("taxes_and_charges")

            si.save()
            return si.as_dict()
    else:
        doc_dict = dict(doc)
        doc_dict.pop("name", None)
        doc_dict["doctype"] = "Sales Invoice"
        doc_dict["docstatus"] = 0
        doc_dict["update_stock"] = 1
        new_si = frappe.get_doc(doc_dict)
        new_si.insert()
        return new_si.as_dict()

@frappe.whitelist()
def submit_sales_invoice(invoice_name):
    """
    Submits a draft Sales Invoice.
    """
    if not invoice_name or not frappe.db.exists("Sales Invoice", invoice_name):
        frappe.throw(_("Sales Invoice {0} not found").format(invoice_name))

    si = frappe.get_doc("Sales Invoice", invoice_name)
    if si.docstatus == 1:
        frappe.msgprint(_("Sales Invoice {0} is already submitted.").format(invoice_name))
        return si.as_dict()
    if si.docstatus == 2:
        frappe.throw(_("Cannot submit a cancelled Sales Invoice."))

    si.submit()
    return si.as_dict()
