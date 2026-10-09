import frappe

@frappe.whitelist()
def get_party_contact(party_type, party_name):
    contact_name = frappe.db.get_value("Dynamic Link", 
        {
            "link_doctype": party_type, 
            "link_name": party_name, 
            "parenttype": "Contact"
        }, 
        "parent"
    )
    
    if contact_name:
        contact = frappe.get_doc("Contact", contact_name)
        return {
            "name": contact.name,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "phone": contact.phone,
            "mobile_no": contact.mobile_no
        }
    
    return None
