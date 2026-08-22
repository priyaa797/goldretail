frappe.ui.form.on('Item', {
    refresh: function(frm) {
        // Fetch current price for Standard Selling
        frappe.call({
            method: 'goldretail.api.item_price.get_item_price',
            args: {
                item_code: frm.doc.item_code,
                price_list: 'Standard Selling'
            },
            callback: function(r) {
                let price_text = 'Price: Not Set';
                let current_price = '';
                let current_uom = frm.doc.stock_uom || ''; // Default to item's standard UOM

                if (r.message) {
                    price_text = `Price: ${format_currency(r.message.price_list_rate)}`;
                    current_price = r.message.price_list_rate;
                    if (r.message.uom) current_uom = r.message.uom;
                }

                frm.add_custom_button(price_text, function() {
                    frappe.prompt([
                        {
                            label: 'Amount',
                            fieldname: 'amount',
                            fieldtype: 'Currency',
                            reqd: 1,
                            default: current_price
                        },
                        {
                            label: 'UOM',
                            fieldname: 'uom',
                            fieldtype: 'Link',
                            options: 'UOM',
                            reqd: 1,
                            default: current_uom
                        }
                    ], function(values) {
                        if (flt(values.amount) <= 0) {
                            frappe.msgprint(__('Price amount must be greater than 0'));
                            return;
                        }
                        
                        frappe.call({
                            method: 'goldretail.api.item_price.set_item_price',
                            args: {
                                item_code: frm.doc.item_code,
                                amount: values.amount,
                                uom: values.uom,
                                price_list: 'Standard Selling'
                            },
                            callback: function(r) {
                                if (!r.exc) {
                                    frm.reload_doc();
                                }
                            }
                        });
                    }, 'Set Standard Selling Price', 'Save');
                }).addClass('btn-primary'); // Make it stand out
            }
        });
    }
});
