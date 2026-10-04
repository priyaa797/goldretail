import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Grid, CircularProgress, Chip } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import { useParams, useNavigate } from 'react-router';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import dayjs from 'dayjs';

export default function PurchaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: doc, isLoading, error } = useFrappeGetDoc('Purchase Invoice', id);

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
        <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/purchase')} sx={{ mb: 2 }}>Back to Purchases</Button>
        <Typography color="error">Error loading invoice details.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/purchase')} color="inherit">Back</Button>
          <Typography variant="h5" fontWeight="bold">{doc.name}</Typography>
          <Chip label={doc.status} color={doc.status === 'Paid' ? 'success' : doc.status === 'Unpaid' ? 'error' : 'warning'} size="small" />
        </Box>
        <Button variant="outlined" startIcon={<IconPrinter size={18} />} onClick={() => window.print()}>Print</Button>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <BlankCard><Box  sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Supplier Details</Typography>
            <Typography variant="h6" fontWeight="bold">{doc.supplier}</Typography>
            {doc.supplier_name && doc.supplier_name !== doc.supplier && (
              <Typography variant="body2" color="text.secondary">{doc.supplier_name}</Typography>
            )}
          </Box></BlankCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <BlankCard><Box  sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Invoice Info</Typography>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Posting Date</Typography>
              <Typography variant="body2" fontWeight="500">{dayjs(doc.posting_date).format('DD MMM YYYY')}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Due Date</Typography>
              <Typography variant="body2" fontWeight="500">{dayjs(doc.due_date).format('DD MMM YYYY')}</Typography>
            </Box>
          </Box></BlankCard>
        </Grid>
      </Grid>

      <BlankCard><Box  sx={{ mb: 4, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: 50 }}>S.No.</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Item Code</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }}>Carton</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }}>Packing</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }}>C. Wt.</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }}>Rate</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }}>Gross Amt</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }}>Discount (%)</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }}>Discount Amt</TableCell>
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
                const discountPercentage = Number(item.discount_percentage) || 0;
                const discountAmt = grossAmount > 0 ? grossAmount * (discountPercentage / 100) : 0;
                const taxableAmount = grossAmount - discountAmt;
                const gstAmt = taxableAmount * (gst_percentage / 100);
                const finalNetAmount = taxableAmount + gstAmt;

                return (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{index + 1}</Typography>
                  </TableCell>
                  <TableCell>{item.item_code}</TableCell>
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
                  <TableCell>{discountPercentage}%</TableCell>
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
          <BlankCard><Box  sx={{ mb: 4, overflow: 'hidden' }}>
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

      <Box display="flex" justifyContent="flex-end">
        <BlankCard><Box  sx={{ p: 3, width: { xs: '100%', md: '300px' } }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">Total</Typography>
            <Typography variant="body2">₹{doc.total}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">Taxes</Typography>
            <Typography variant="body2">₹{doc.total_taxes_and_charges}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="bold">Grand Total</Typography>
            <Typography variant="subtitle1" fontWeight="bold">₹{doc.grand_total}</Typography>
          </Box>
          {doc.rounding_adjustment !== 0 && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">Rounding Adjustment</Typography>
              <Typography variant="body2">₹{doc.rounding_adjustment}</Typography>
            </Box>
          )}
          {doc.rounded_total > 0 && doc.rounded_total !== doc.grand_total && (
            <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold">Rounded Total</Typography>
              <Typography variant="subtitle1" fontWeight="bold">₹{doc.rounded_total}</Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="body2" color="error">Outstanding</Typography>
            <Typography variant="body2" color="error" fontWeight="bold">₹{doc.outstanding_amount}</Typography>
          </Box>
        </Box></BlankCard>
      </Box>

      {/* Meta Information Section */}
      <BlankCard><Box  sx={{ mt: 4, p: 3, bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
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
  );
}
