// Gold Retail — Stock Reconciliation customization
// Adds "Packing / Pieces per Carton" to each item row, fetched from Item Master
// On submit: detects changed values and prompts user to optionally update Item Master.

frappe.ui.form.on('Stock Reconciliation', {

    // ── Fetch packing for all rows when an existing doc is loaded ──────────────
    refresh: function (frm) {
        if (frm.doc.docstatus === 0) {
            goldretail.sr.fetch_packings_for_all_rows(frm);
        }
    },

    // ── Intercept submission to check for packing changes ─────────────────────
    before_submit: function (frm) {
        return goldretail.sr.check_packing_changes_before_submit(frm);
    }
});

frappe.ui.form.on('Stock Reconciliation Item', {

    // ── Fetch packing when an item is selected or changed in a row ─────────────
    item_code: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (!row.item_code) {
            frappe.model.set_value(cdt, cdn, 'packing', '');
            return;
        }
        frappe.call({
            method: 'goldretail.api.stock_reconciliation.get_packings_for_items',
            args: { item_codes: JSON.stringify([row.item_code]) },
            callback: function (r) {
                if (r.message && r.message[row.item_code] !== undefined) {
                    frappe.model.set_value(cdt, cdn, 'packing', r.message[row.item_code]);
                }
            }
        });
    }
});

// ── Namespace ─────────────────────────────────────────────────────────────────
frappe.provide('goldretail.sr');

/**
 * Bulk-fetch packings for all rows that have an item_code and no packing set.
 * Uses a single API call instead of one per row.
 */
goldretail.sr.fetch_packings_for_all_rows = function (frm) {
    var items = (frm.doc.items || []);
    var item_codes = [...new Set(
        items
            .filter(function (r) { return r.item_code && !r.packing; })
            .map(function (r) { return r.item_code; })
    )];

    if (!item_codes.length) return;

    frappe.call({
        method: 'goldretail.api.stock_reconciliation.get_packings_for_items',
        args: { item_codes: JSON.stringify(item_codes) },
        callback: function (r) {
            if (!r.message) return;
            var packing_map = r.message;
            items.forEach(function (row) {
                if (row.item_code && !row.packing && packing_map[row.item_code] !== undefined) {
                    frappe.model.set_value(
                        row.doctype, row.name, 'packing', packing_map[row.item_code]
                    );
                }
            });
        }
    });
};

/**
 * Before submission: compare each row's packing against current Item Master value.
 * If any differ, show a confirmation dialog offering to update Item Master.
 * Returns a Promise so Frappe waits for user response before proceeding.
 */
goldretail.sr.check_packing_changes_before_submit = function (frm) {
    // Guard: skip if already confirmed in this submission attempt
    if (frm._sr_packing_confirmed) {
        return Promise.resolve();
    }

    var items = (frm.doc.items || []);
    var item_codes = [...new Set(
        items
            .filter(function (r) { return r.item_code; })
            .map(function (r) { return r.item_code; })
    )];

    if (!item_codes.length) return Promise.resolve();

    return new Promise(function (resolve, reject) {
        frappe.call({
            method: 'goldretail.api.stock_reconciliation.get_packings_for_items',
            args: { item_codes: JSON.stringify(item_codes) },
            callback: function (r) {
                if (r.exc || !r.message) {
                    // If we can't fetch, proceed without blocking submission
                    resolve();
                    return;
                }

                var master_map = r.message;

                // Find rows where the SR value differs from Item Master
                var changed = [];
                items.forEach(function (row) {
                    if (!row.item_code) return;

                    var sr_val = parseFloat(row.packing) || 0;
                    var master_val = parseFloat(master_map[row.item_code]) || 0;

                    if (sr_val !== master_val) {
                        changed.push({
                            item_code: row.item_code,
                            item_name: row.item_name || '',
                            master_packing: master_val,
                            sr_packing: sr_val
                        });
                    }
                });

                // No changes — submit normally
                if (!changed.length) {
                    resolve();
                    return;
                }

                // Build table HTML for the dialog
                var table_rows = changed.map(function (c) {
                    return '<tr>'
                        + '<td style="padding:4px 8px;border:1px solid #ddd;">' + frappe.utils.escape_html(c.item_code) + '</td>'
                        + '<td style="padding:4px 8px;border:1px solid #ddd;">' + frappe.utils.escape_html(c.item_name) + '</td>'
                        + '<td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">' + (c.master_packing || '—') + '</td>'
                        + '<td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">' + (c.sr_packing || '—') + '</td>'
                        + '</tr>';
                }).join('');

                var table_html = '<p style="margin-bottom:8px;">'
                    + __('The following items have a different Pieces per Carton value in this Stock Reconciliation compared to the Item Master. '
                        + 'Do you want to update these values in the Item Master?')
                    + '</p>'
                    + '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
                    + '<thead><tr style="background:#f5f5f5;">'
                    + '<th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">' + __('Item Code') + '</th>'
                    + '<th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">' + __('Item Name') + '</th>'
                    + '<th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">' + __('Item Master Value') + '</th>'
                    + '<th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">' + __('Stock Reconciliation Value') + '</th>'
                    + '</tr></thead>'
                    + '<tbody>' + table_rows + '</tbody>'
                    + '</table>';

                var dialog = new frappe.ui.Dialog({
                    title: __('Packing / Pieces per Carton Changed'),
                    fields: [
                        {
                            fieldtype: 'HTML',
                            fieldname: 'packing_change_table',
                            options: table_html
                        }
                    ],
                    primary_action_label: __('Yes, Update Item Master'),
                    primary_action: function () {
                        dialog.hide();

                        // Build payload — one entry per unique item_code
                        var seen = {};
                        var payload = [];
                        changed.forEach(function (c) {
                            if (!seen[c.item_code]) {
                                seen[c.item_code] = true;
                                payload.push({ item_code: c.item_code, packing: c.sr_packing });
                            }
                        });

                        frappe.call({
                            method: 'goldretail.api.stock_reconciliation.update_item_packings_from_sr',
                            args: { item_packings: JSON.stringify(payload) },
                            freeze: true,
                            freeze_message: __('Updating Item Master…'),
                            callback: function (r) {
                                if (r.exc) {
                                    frappe.msgprint({
                                        title: __('Item Master Update Failed'),
                                        message: __('Could not update Item Master. Submission has been cancelled. Please check your permissions and try again.'),
                                        indicator: 'red'
                                    });
                                    reject();
                                    return;
                                }

                                var result = r.message || {};
                                if (result.skipped && result.skipped.length) {
                                    frappe.msgprint({
                                        title: __('Partial Update'),
                                        message: __('The following items could not be updated: ')
                                            + result.skipped.join(', '),
                                        indicator: 'orange'
                                    });
                                }

                                // Mark confirmed so retry doesn't re-show dialog
                                frm._sr_packing_confirmed = true;
                                resolve();
                            }
                        });
                    },
                    secondary_action_label: __('No, Continue Without Updating'),
                    secondary_action: function () {
                        dialog.hide();
                        // Mark confirmed so retry doesn't re-show dialog
                        frm._sr_packing_confirmed = true;
                        resolve();
                    }
                });

                // Handle dialog close (X button) — treat as cancel submission
                dialog.onhide = function () {
                    if (!frm._sr_packing_confirmed) {
                        reject();
                    }
                };

                dialog.show();
            }
        });
    });
};
