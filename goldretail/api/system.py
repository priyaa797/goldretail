import frappe
from frappe import _

@frappe.whitelist()
def trigger_kill_switch(image_url):
    # Check if the user is a System Manager
    if "System Manager" not in frappe.get_roles():
        frappe.throw(_("Not permitted to trigger the kill switch. System Manager role is required."))
    
    state = {
        'is_down': True,
        'image_url': image_url
    }
    
    # Store the state in cache (does not persist across Redis restarts)
    frappe.cache().set_value('system_down_state', state)
    
    # Broadcast to all connected clients immediately
    frappe.publish_realtime('system_down_toggled', state, after_commit=False)
    
    return {"status": "success"}

@frappe.whitelist(allow_guest=True)
def get_system_status():
    # Return the current status from cache
    state = frappe.cache().get_value('system_down_state')
    if not state:
        state = {'is_down': False, 'image_url': None}
    
    # Check if current user is System Manager
    is_system_manager = False
    if frappe.session.user != "Guest":
        is_system_manager = "System Manager" in frappe.get_roles()
        
    state['is_system_manager'] = is_system_manager
    
    return state
