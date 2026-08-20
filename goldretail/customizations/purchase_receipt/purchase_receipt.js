frappe.ui.form.on('Purchase Receipt', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 0 && !frm.is_new()) {
            frm.add_custom_button(__('Generate Barcodes'), function() {
                frappe.call({
                    method: 'goldretail.customizations.purchase_receipt.purchase_receipt.generate_barcodes',
                    args: {
                        docname: frm.doc.name
                    },
                    freeze: true,
                    callback: function(r) {
                        if (r.message > 0) {
                            frappe.msgprint(__('Generated ' + r.message + ' new barcodes for items.'));
                        } else {
                            frappe.msgprint(__('All items already have barcodes.'));
                        }
                    }
                });
            }, __('Actions'));
        }
    }
});
