import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Grid, CircularProgress, Chip } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useParams, useNavigate } from 'react-router';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { IconArrowLeft, IconPrinter, IconEdit } from '@tabler/icons-react';
import dayjs from 'dayjs';

export default function SalesDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: doc, isLoading, error } = useFrappeGetDoc('Sales Invoice', id);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !doc) {
    return (
      <Box>
        <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/sales')} sx={{ mb: 2 }}>Back to Saless</Button>
        <Typography color="error">Error loading invoice details.</Typography>
      </Box>
    );
  }

  return (
    <>
      <style>
        {`
          .print-only { display: none; }
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }

            /* Hide toasts, snackbars, notifications */
            .MuiSnackbar-root,
            .MuiAlert-root,
            [class*="toast"],
            [class*="Toast"],
            [class*="Toastify"],
            [id*="toast"],
            [role="alert"],
            [role="status"] { display: none !important; }

            /* A5 portrait, zero browser margins so no browser header/footer */
            @page {
              size: A5 portrait;
              margin: 5mm 5mm 5mm 5mm;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: visible !important;
            }

            /* Hide all direct body children except #root */
            body > *:not(#root) { display: none !important; }

            /* Ensure scripts, styles, noscript never render */
            script,
            style,
            noscript {
              display: none !important;
            }

            /* Reset only the known container chain — do NOT set display:block on body > * */
            #root,
            #root > *,
            .mainwrapper,
            .page-wrapper,
            .MuiContainer-root {
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: 0 !important;
              height: auto !important;
              max-width: 100% !important;
              width: 100% !important;
              overflow: visible !important;
              background: transparent !important;
              box-shadow: none !important;
              border: none !important;
            }

            /* Hide everything outside the main content path: loading bar, sidebar, header, etc. */
            #root > *:not(.mainwrapper),
            .mainwrapper > *:not(.page-wrapper),
            .page-wrapper > *:not(.MuiContainer-root),
            .MuiDrawer-root,
            .MuiModal-root,
            .MuiPopover-root,
            .MuiBackdrop-root,
            .MuiAppBar-root,
            header,
            nav,
            aside {
              display: none !important;
            }

            /* The print-only block itself */
            .print-only {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              width: 100% !important;
              overflow: visible !important;
              font-size: 9px !important;
              font-family: Arial, sans-serif !important;
              color: #000 !important;
            }

            .print-only * {
              box-sizing: border-box !important;
              font-size: 9px !important;
            }

            .print-only table {
              width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
            }

            .print-only thead {
              display: table-header-group !important;
            }
            .print-only tfoot {
              display: table-footer-group !important;
            }

            /* Compact rows — target: 30 items per A5 page */
            .print-only th,
            .print-only td {
              padding: 1px 3px !important;
              line-height: 1.2 !important;
              vertical-align: top !important;
            }

            .print-only tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            /* Main print items table font size (11px) */
            .print-only table.print-main-table th,
            .print-only table.print-main-table td,
            .print-only table.print-main-table * {
              font-size: 10px !important;
            }

            /* Print header info area */
            .print-header {
              font-size: 9px !important;
              margin-bottom: 6px !important;
              width: 100% !important;
            }
            .print-header-row {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              width: 100% !important;
            }
            .print-header-row-1 {
              margin-bottom: 2px !important;
            }
            .print-header-title {
              font-size: 11px !important;
              font-weight: bold !important;
              text-align: center !important;
              text-decoration: underline !important;
              margin-bottom: 3px !important;
            }
            .print-header-row-1 > div {
              flex: 1 !important;
            }
            .print-header-left {
              text-align: left !important;
              white-space: nowrap !important;
            }
            .print-header-center {
              text-align: center !important;
              font-weight: bold !important;
              white-space: nowrap !important;
            }
            .print-header-right {
              text-align: right !important;
              white-space: nowrap !important;
            }
            .print-header-row-2 {
              align-items: baseline !important;
            }
            .print-header-customer {
              text-align: left !important;
            }
            .print-header-weight {
              text-align: right !important;
              white-space: nowrap !important;
            }

            /* Print footer & Terms */
            .print-thank-you {
              margin-top: 6px !important;
              padding-top: 3px !important;
              border-top: 1px solid #000 !important;
              text-align: center !important;
            }
            .print-terms {
              margin-top: 6px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .print-terms-title {
              font-size: 8.5px !important;
              font-weight: bold !important;
              margin-bottom: 2px !important;
            }
            .print-terms-list {
              margin: 0 !important;
              padding-left: 14px !important;
              font-size: 8px !important;
              line-height: 1.25 !important;
            }
            .print-terms-list li {
              font-size: 8px !important;
              line-height: 1.25 !important;
              margin-bottom: 1px !important;
            }
          }
        `}
      </style>
      <Box className="no-print">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/sales')} color="inherit">Back</Button>
            <Typography variant="h5" fontWeight="bold">{doc.name}</Typography>
            <Chip label={doc.status} color={doc.status === 'Paid' ? 'success' : doc.status === 'Unpaid' ? 'error' : 'warning'} size="small" />
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="contained"
              startIcon={<IconEdit size={18} />}
              onClick={() => navigate(`/sales/${encodeURIComponent(doc.name)}/edit`)}
            >
              Update
            </Button>
            <Button variant="outlined" startIcon={<IconPrinter size={18} />} onClick={() => {
              const originalTitle = document.title;
              document.title = `${doc.customer_name || doc.customer} - ${doc.name}`;
              window.print();
              setTimeout(() => {
                document.title = originalTitle;
              }, 500);
            }}>Print</Button>
          </Box>
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <BlankCard><Box sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Customer Details</Typography>
              <Typography variant="h6" fontWeight="bold">{doc.customer}</Typography>
              {doc.customer_name && doc.customer_name !== doc.customer && (
                <Typography variant="body2" color="text.secondary">{doc.customer_name}</Typography>
              )}
            </Box></BlankCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <BlankCard><Box sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Invoice Info</Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Posting Date</Typography>
                <Typography variant="body2" fontWeight="500">{dayjs(doc.posting_date).format('DD MMM YYYY')}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Due Date</Typography>
                <Typography variant="body2" fontWeight="500">{dayjs(doc.due_date).format('DD MMM YYYY')}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Price List</Typography>
                <Typography variant="body2" fontWeight="500">{doc.selling_price_list || '-'}</Typography>
              </Box>
            </Box></BlankCard>
          </Grid>
        </Grid>

        <BlankCard><Box sx={{ mb: 4, overflow: 'hidden', maxWidth: '100%' }}>
          <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 1800 }}>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 60, minWidth: 60, position: 'sticky', left: 0, bgcolor: 'background.default', zIndex: 2 }}>S.No.</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 250, minWidth: 250, position: 'sticky', left: 60, bgcolor: 'background.default', zIndex: 2, borderRight: '1px solid', borderColor: 'divider' }}>Item Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Item Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>Carton</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>Packing</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>C. Wt.</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Gross Amt</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>Disc (%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Disc Amt</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>GST %</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>GST Amt</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Net Amt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doc.items?.map((item, index) => {
                  const gst_percentage = (Number(item.cgst_rate) || 0) + (Number(item.sgst_rate) || 0) + (Number(item.igst_rate) || 0);

                  const qty = Number(item.qty) || 0;
                  const baseRate = Number(item.price_list_rate) || Number(item.rate) || 0;
                  const grossAmount = qty * baseRate;
                  const discountAmt = (baseRate - (Number(item.rate) || 0)) * qty;
                  const taxableAmount = grossAmount - discountAmt;
                  const gstAmt = taxableAmount * (gst_percentage / 100);
                  const finalNetAmount = taxableAmount + gstAmt;

                  return (
                    <TableRow key={index}>
                      <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{index + 1}</Typography>
                      </TableCell>
                      <TableCell sx={{ position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid', borderColor: 'divider' }}>{item.item_code}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }} title={item.description}>
                          {item.description ? item.description.replace(/<[^>]*>?/gm, '') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.carton || '-'}</TableCell>
                      <TableCell>{item.packing || '-'}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>{item.carton_weight || '-'}</TableCell>
                      <TableCell>₹{baseRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>₹{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{item.discount_percentage || 0}%</TableCell>
                      <TableCell>₹{discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{gst_percentage}%</TableCell>
                      <TableCell>₹{gstAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>₹{finalNetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box></BlankCard>

        {(() => {
          const gstBreakup = {};
          let hasTaxes = false;

          doc.items?.forEach(item => {
            const cgstRate = Number(item.cgst_rate) || 0;
            const sgstRate = Number(item.sgst_rate) || 0;
            const igstRate = Number(item.igst_rate) || 0;
            const gst_percentage = cgstRate + sgstRate + igstRate;

            if (gst_percentage > 0) {
              hasTaxes = true;
              const qty = Number(item.qty) || 0;
              const baseRate = Number(item.price_list_rate) || Number(item.rate) || 0;
              const grossAmount = qty * baseRate;
              const discountAmt = (baseRate - (Number(item.rate) || 0)) * qty;
              const taxableAmount = grossAmount - discountAmt;

              const cgstAmt = taxableAmount * (cgstRate / 100);
              const sgstAmt = taxableAmount * (sgstRate / 100);
              const igstAmt = taxableAmount * (igstRate / 100);

              if (!gstBreakup[gst_percentage]) {
                gstBreakup[gst_percentage] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0 };
              }
              gstBreakup[gst_percentage].taxable += taxableAmount;
              gstBreakup[gst_percentage].cgst += cgstAmt;
              gstBreakup[gst_percentage].sgst += sgstAmt;
              gstBreakup[gst_percentage].igst += igstAmt;
              gstBreakup[gst_percentage].total_tax += (cgstAmt + sgstAmt + igstAmt);
            }
          });

          if (!hasTaxes) return null;

          return (
            <BlankCard><Box sx={{ mb: 4, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>GST Rate</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Taxable Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>CGST Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>SGST Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>IGST Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Tax</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(gstBreakup).map(([rate, data]) => (
                      <TableRow key={rate}>
                        <TableCell>{rate}%</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>₹{data.taxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>₹{data.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>₹{data.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>₹{data.igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>₹{data.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box></BlankCard>
          );
        })()}


        {(() => {
          const actualCharges = doc.taxes?.filter(t => t.charge_type === 'Actual') || [];
          const actualChargesTotal = actualCharges.reduce((acc, curr) => acc + (Number(curr.tax_amount) || 0), 0);
          const totalTaxes = (Number(doc.total_taxes_and_charges) || 0) - actualChargesTotal;

          return (
            <Box mb={4}>
              <BlankCard>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={3} sx={{ p: 3 }}>
                  <Box sx={{ width: { xs: '100%', md: '280px' } }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>Additional Charges</Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {actualCharges.length > 0 ? actualCharges.map((charge, i) => {
                        const label = charge.account_head ? charge.account_head.split(' - ')[0] : charge.description;
                        return (
                          <Box key={i} display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{label}:</Typography>
                            <Typography variant="body2" fontWeight="500">₹{charge.tax_amount}</Typography>
                          </Box>
                        );
                      }) : (
                        <Typography variant="body2" color="text.secondary">No additional charges.</Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '280px' } }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>Transportation Details</Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Driver Name:</Typography>
                        <Typography variant="body2" fontWeight="500">{doc.driver_name || '-'}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Vehicle No:</Typography>
                        <Typography variant="body2" fontWeight="500">{doc.vehicle_no || '-'}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '300px' } }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography variant="body2">₹{Number(doc.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">Taxes</Typography>
                      <Typography variant="body2">₹{Number(totalTaxes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                    {actualCharges.map((charge, i) => {
                      const label = charge.account_head ? charge.account_head.split(' - ')[0] : charge.description;
                      return (
                        <Box key={`total-${i}`} display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="text.secondary">{label}</Typography>
                          <Typography variant="body2">₹{Number(charge.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                        </Box>
                      );
                    })}
                    <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle1" fontWeight="bold">Grand Total</Typography>
                      <Typography variant="subtitle1" fontWeight="bold">₹{Number(doc.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                    {doc.rounding_adjustment !== 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Rounding Adjustment</Typography>
                        <Typography variant="body2">₹{Number(doc.rounding_adjustment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    {doc.rounded_total > 0 && doc.rounded_total !== doc.grand_total && (
                      <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight="bold">Rounded Total</Typography>
                        <Typography variant="subtitle1" fontWeight="bold">₹{Number(doc.rounded_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    )}
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="body2" color="error">Outstanding</Typography>
                      <Typography variant="body2" color="error" fontWeight="bold">₹{Number(doc.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                  </Box>
                </Box>
              </BlankCard>
            </Box>
          );
        })()}

        {/* Meta Information Section */}
        <BlankCard><Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Document Info</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Created By</Typography>
              <Typography variant="body2" fontWeight="600">{doc.owner}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Created On</Typography>
              <Typography variant="body2" fontWeight="600">{dayjs(doc.creation).format('DD MMM YYYY, HH:mm')}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Last Modified By</Typography>
              <Typography variant="body2" fontWeight="600">{doc.modified_by}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Last Modified On</Typography>
              <Typography variant="body2" fontWeight="600">{dayjs(doc.modified).format('DD MMM YYYY, HH:mm')}</Typography>
            </Grid>
          </Grid>
        </Box></BlankCard>
      </Box>

      {/* Print Only Section */}
      <Box className="print-only">
        {/* Header info rendered OUTSIDE the table so thead only repeats column headers */}
        <div className="print-header">
          <div className="print-header-row print-header-row-1">
            <div className="print-header-left">
              <strong>Invoice No:</strong> {doc.name}
            </div>
            <div className="print-header-center">
              ||Shree Ganeshay Namah||
            </div>
            <div className="print-header-right">
              <strong>Date:</strong> {dayjs(doc.posting_date).format('DD MMM YYYY')}
            </div>
          </div>
          <div className="print-header-title">Estimate/Packing List</div>
          <div className="print-header-row print-header-row-2">
            <div className="print-header-customer">
              <strong>Customer:</strong> {doc.customer_name || doc.customer}
            </div>
            <div className="print-header-weight">
              <strong>Total Weight:</strong> {(doc.items?.reduce((acc, curr) => acc + (Number(curr.total_weight) || Number(curr.carton_weight) || 0), 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgs.
            </div>
          </div>
          {(doc.driver_name || doc.vehicle_no) && (
            <div className="print-header-row print-header-row-3" style={{ marginTop: '2px' }}>
              <div style={{ textAlign: 'left' }}>
                {doc.driver_name && <span><strong>Driver:</strong> {doc.driver_name}</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {doc.vehicle_no && <span><strong>Vehicle No:</strong> {doc.vehicle_no}</span>}
              </div>
            </div>
          )}
        </div>

        <table className="print-main-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'left' }}>S.No</th>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'left' }}>Items</th>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right' }}>Ctn</th>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right' }}>Rate</th>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right' }}>Disc. Rate</th>
              <th style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right' }}>Gross Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.items?.map((item, index) => {
              const gst_percentage = (Number(item.cgst_rate) || 0) + (Number(item.sgst_rate) || 0) + (Number(item.igst_rate) || 0);
              const qty = Number(item.qty) || 0;
              const baseRate = Number(item.price_list_rate) || Number(item.rate) || 0;
              const grossAmount = qty * baseRate;
              const discountAmt = (baseRate - (Number(item.rate) || 0)) * qty;
              const taxableAmount = grossAmount - discountAmt;
              const gstAmt = taxableAmount * (gst_percentage / 100);
              const finalNetAmount = taxableAmount + gstAmt;

              const P = '1px 3px';
              const B = '1px solid #000';
              return (
                <tr key={index}>
                  <td style={{ border: B, padding: P, verticalAlign: 'top' }}>{index + 1}</td>
                  <td style={{ border: B, padding: P, verticalAlign: 'top' }}>
                    {item.item_code} - {item.item_name}
                  </td>
                  <td style={{ border: B, padding: P, textAlign: 'right', verticalAlign: 'top' }}>{item.carton || '-'}</td>
                  <td style={{ border: B, padding: P, textAlign: 'right', verticalAlign: 'top' }}>{qty}</td>
                  <td style={{ border: B, padding: P, textAlign: 'right', verticalAlign: 'top' }}>₹{baseRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ border: B, padding: P, textAlign: 'right', verticalAlign: 'top' }}>
                    ₹{(Number(item.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {item.discount_percentage ? <span> ({item.discount_percentage}%)</span> : null}
                  </td>
                  <td style={{ border: B, padding: P, textAlign: 'right', verticalAlign: 'top' }}>₹{(Number(item.amount) || taxableAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', fontWeight: 'bold' }}>Totals</td>
              <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', fontWeight: 'bold' }}>
                {doc.items?.reduce((acc, curr) => acc + (Number(curr.carton) || 0), 0) || '-'}
              </td>
              <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', fontWeight: 'bold' }}>
                {doc.items?.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0) || 0}
              </td>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '1px 3px' }}></td>
              <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'right', fontWeight: 'bold' }}>
                ₹{(doc.items?.reduce((acc, curr) => {
                  const qty = Number(curr.qty) || 0;
                  const baseRate = Number(curr.price_list_rate) || Number(curr.rate) || 0;
                  const grossAmount = qty * baseRate;
                  const discountAmt = (baseRate - (Number(curr.rate) || 0)) * qty;
                  const taxableAmount = grossAmount - discountAmt;
                  return acc + (Number(curr.amount) || taxableAmount);
                }, 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {(() => {
          const gstBreakup = {};
          let hasTaxes = false;

          doc.items?.forEach(item => {
            const cgstRate = Number(item.cgst_rate) || 0;
            const sgstRate = Number(item.sgst_rate) || 0;
            const igstRate = Number(item.igst_rate) || 0;
            const gst_percentage = cgstRate + sgstRate + igstRate;

            if (gst_percentage > 0) {
              hasTaxes = true;
              const qty = Number(item.qty) || 0;
              const baseRate = Number(item.price_list_rate) || Number(item.rate) || 0;
              const grossAmount = qty * baseRate;
              const discountAmt = (baseRate - (Number(item.rate) || 0)) * qty;
              const taxableAmount = grossAmount - discountAmt;

              const cgstAmt = taxableAmount * (cgstRate / 100);
              const sgstAmt = taxableAmount * (sgstRate / 100);
              const igstAmt = taxableAmount * (igstRate / 100);

              if (!gstBreakup[gst_percentage]) {
                gstBreakup[gst_percentage] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0 };
              }
              gstBreakup[gst_percentage].taxable += taxableAmount;
              gstBreakup[gst_percentage].cgst += cgstAmt;
              gstBreakup[gst_percentage].sgst += sgstAmt;
              gstBreakup[gst_percentage].igst += igstAmt;
              gstBreakup[gst_percentage].total_tax += (cgstAmt + sgstAmt + igstAmt);
            }
          });

          if (!hasTaxes) return null;

          return (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>GST Details:</Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>GST Rate</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Taxable Amt</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>CGST</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>SGST</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>IGST</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstBreakup).map(([rate, data]) => (
                    <tr key={rate}>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>{rate}%</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>₹{data.taxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>₹{data.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>₹{data.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>₹{data.igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>₹{data.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          );
        })()}

        {(() => {
          const actualCharges = doc.taxes?.filter(t => t.charge_type === 'Actual') || [];
          const actualChargesTotal = actualCharges.reduce((acc, curr) => acc + (Number(curr.tax_amount) || 0), 0);
          const totalTaxes = (Number(doc.total_taxes_and_charges) || 0) - actualChargesTotal;

          return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <table style={{ width: '250px', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>Total Taxable:</td>
                    <td style={{ padding: '4px', textAlign: 'right' }}>₹{Number(doc.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>Total Taxes:</td>
                    <td style={{ padding: '4px', textAlign: 'right' }}>₹{Number(totalTaxes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  {actualCharges.map((charge, i) => {
                    const label = charge.account_head ? charge.account_head.split(' - ')[0] : charge.description;
                    return (
                      <tr key={`print-charge-${i}`}>
                        <td style={{ padding: '4px', fontWeight: 'bold' }}>{label}:</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>₹{Number(charge.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td style={{ padding: '6px 4px', fontWeight: 'bold', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>Grand Total:</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>₹{Number(doc.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </Box>
          );
        })()}



        {/* <Box className="print-thank-you" sx={{ mt: 4, pt: 2, borderTop: '1px solid #000', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>Thank you for your business!</Typography>
        </Box> */}

        <div className="print-terms">
          <div className="print-terms-title">Terms &amp; Conditions</div>
          <ol className="print-terms-list">
            <li>This is an estimate only. The rates and stock available on the date of dispatch will be applicable.</li>
            <li>We are not responsible for breakage during transportation.</li>
            <li>No replacements or the guarantee will be provided.</li>
            <li>Please instruct your transporter to handle the goods with care.</li>
          </ol>
        </div>

      </Box>
    </>
  );
}
