frappe.ui.form.on('Item', {
    refresh: function (frm) {
        let get_price = function (price_list) {
            return new Promise(resolve => {
                frappe.call({
                    method: 'goldretail.api.item_price.get_item_price',
                    args: {
                        item_code: frm.doc.item_code,
                        price_list: price_list
                    },
                    callback: function (r) {
                        resolve(r.message);
                    }
                });
            });
        };

        Promise.all([
            get_price('Wholesale'),
            get_price('Retail')
        ]).then(function (responses) {
            let ws_res = responses[0];
            let ret_res = responses[1];

            let ws_price_str = ws_res ? format_currency(ws_res.price_list_rate) : 'Not Set';
            let ret_price_str = ret_res ? format_currency(ret_res.price_list_rate) : 'Not Set';

            let price_text = `${ws_price_str} / ${ret_price_str}`;
            let current_ws_price = ws_res ? ws_res.price_list_rate : '';
            let current_uom = (ws_res && ws_res.uom) ? ws_res.uom : (frm.doc.stock_uom || '');

            frm.add_custom_button(price_text, function () {
                frappe.prompt([
                    {
                        label: 'Price List',
                        fieldname: 'price_list',
                        fieldtype: 'Select',
                        options: 'Wholesale\nRetail',
                        default: 'Wholesale',
                        reqd: 1
                    },
                    {
                        label: 'Amount',
                        fieldname: 'amount',
                        fieldtype: 'Currency',
                        reqd: 1,
                        default: current_ws_price
                    },
                    {
                        label: 'UOM',
                        fieldname: 'uom',
                        fieldtype: 'Link',
                        options: 'UOM',
                        reqd: 1,
                        default: current_uom
                    }
                ], function (values) {
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
                            price_list: values.price_list
                        },
                        callback: function (r) {
                            if (!r.exc) {
                                frm.reload_doc();
                            }
                        }
                    });
                }, 'Set Item Price', 'Save');
            }).addClass('btn-primary'); // Make it stand out
        });

        if (!frm.is_new()) {
            frm.add_custom_button(__('Generate Barcode'), function () {
                frappe.call({
                    method: 'goldretail.api.item_barcode.generate_barcode',
                    args: {
                        item_code: frm.doc.item_code
                    },
                    freeze: true,
                    callback: function (r) {
                        if (r.message) {
                            frappe.msgprint(__('Generated/Updated barcode: ' + r.message));
                            frm.reload_doc();
                        }
                    }
                });
            }, __('Actions'));

            frm.add_custom_button(__('Generate QR Code'), function () {
                frappe.call({
                    method: 'goldretail.api.item_barcode.generate_qr',
                    args: {
                        item_code: frm.doc.item_code
                    },
                    freeze: true,
                    callback: function (r) {
                        if (r.message) {
                            frappe.msgprint(__('Generated/Updated QR Code: ' + r.message));
                            frm.reload_doc();
                        }
                    }
                });
            }, __('Actions'));
        }
    }
});
