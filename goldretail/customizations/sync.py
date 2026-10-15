import os
import json
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

def sync_all():
    print("Syncing Customizations for Gold Retail...")
    app_path = frappe.get_app_path("goldretail", "customizations")
    if not os.path.exists(app_path):
        print("No customizations folder found.")
        return

    # Loop through subdirectories
    for doctype_folder in os.listdir(app_path):
        doctype_path = os.path.join(app_path, doctype_folder)
        if not os.path.isdir(doctype_path):
            continue

        # 1. Sync Custom Fields
        custom_fields_file = os.path.join(doctype_path, "custom_field.json")
        if os.path.exists(custom_fields_file):
            with open(custom_fields_file, "r") as f:
                fields = json.load(f)
                for field in fields:
                    create_custom_field(field.get("dt"), field)
                    print(f"Synced Custom Field: {field.get('fieldname')} for {field.get('dt')}")

        # 2. Sync Property Setters
        property_setters_file = os.path.join(doctype_path, "property_setter.json")
        if os.path.exists(property_setters_file):
            with open(property_setters_file, "r") as f:
                setters = json.load(f)
                for setter in setters:
                    make_property_setter(
                        setter.get("doc_type"),
                        setter.get("field_name"),
                        setter.get("property"),
                        setter.get("value"),
                        setter.get("property_type")
                    )
                    print(f"Synced Property Setter: {setter.get('property')} for {setter.get('field_name')} in {setter.get('doc_type')}")
