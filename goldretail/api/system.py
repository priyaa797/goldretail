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

@frappe.whitelist()
def save_user_theme(theme_name):
    if frappe.session.user == "Guest":
        return {"status": "failed"}
    
    # Check if a User Settings record exists for this user
    settings = frappe.get_all("User Settings", filters={"user": frappe.session.user}, limit=1)
    if settings:
        frappe.db.set_value("User Settings", settings[0].name, "theme", theme_name)
    else:
        doc = frappe.new_doc("User Settings")
        doc.user = frappe.session.user
        doc.theme = theme_name
        doc.insert(ignore_permissions=True)
        
    return {"status": "success"}

@frappe.whitelist(allow_guest=True)
def get_user_theme():
    if frappe.session.user == "Guest":
        return None
        
    settings = frappe.get_all("User Settings", filters={"user": frappe.session.user}, fields=["theme"], limit=1)
    if settings and settings[0].theme:
        return settings[0].theme
    return None

@frappe.whitelist()
def set_desk_theme(mode):
    if frappe.session.user == "Guest":
        return {"status": "failed"}
    desk_theme = "Dark" if str(mode).lower() == "dark" else "Light"
    frappe.db.set_value("User", frappe.session.user, "desk_theme", desk_theme)
    return {"status": "success"}

@frappe.whitelist(allow_guest=True)
def get_desk_theme():
    if frappe.session.user == "Guest":
        return None
    return frappe.db.get_value("User", frappe.session.user, "desk_theme")
