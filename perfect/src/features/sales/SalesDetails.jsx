import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Grid, CircularProgress, Chip } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { ArrowLeft, Printer } from 'lucide-react';
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
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/sales')} sx={{ mb: 2 }}>Back to Saless</Button>
        <Typography color="error">Error loading invoice details.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/sales')} color="inherit">Back</Button>
          <Typography variant="h5" fontWeight="bold">{doc.name}</Typography>
          <Chip label={doc.status} color={doc.status === 'Paid' ? 'success' : doc.status === 'Unpaid' ? 'error' : 'warning'} size="small" />
        </Box>
        <Button variant="outlined" startIcon={<Printer size={18} />} onClick={() => window.print()}>Print</Button>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Customer Details</Typography>
            <Typography variant="h6" fontWeight="bold">{doc.customer}</Typography>
            {doc.customer_name && doc.customer_name !== doc.customer && (
              <Typography variant="body2" color="text.secondary">{doc.customer_name}</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
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
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 4, overflow: 'hidden', maxWidth: '100%' }}>
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
                <TableCell sx={{ fontWeight: 600, width: 120 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 120 }}>Discount Amt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doc.items?.map((item, index) => {
                const qty = Number(item.qty) || 0;
                const baseRate = Number(item.price_list_rate) || Number(item.rate) || 0;
                const grossAmount = qty * baseRate;
                const discountAmt = (baseRate - (Number(item.rate) || 0)) * qty;

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
                  <TableCell>₹{discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {doc.taxes && doc.taxes.length > 0 && (
        <Paper sx={{ mb: 4, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Tax Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Tax Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doc.taxes.map((tax, index) => (
                  <TableRow key={index}>
                    <TableCell>{tax.description}</TableCell>
                    <TableCell>{tax.rate}%</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>₹{tax.tax_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Box display="flex" justifyContent="flex-end">
        <Paper sx={{ p: 3, width: { xs: '100%', md: '300px' } }}>
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
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="body2" color="error">Outstanding</Typography>
            <Typography variant="body2" color="error" fontWeight="bold">₹{doc.outstanding_amount}</Typography>
          </Box>
        </Paper>
      </Box>

      {/* Meta Information Section */}
      <Paper sx={{ mt: 4, p: 3, bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
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
      </Paper>
    </Box>
  );
}
