import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Grid, CircularProgress, Chip } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { ArrowLeft, Printer } from 'lucide-react';
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
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/purchase')} sx={{ mb: 2 }}>Back to Purchases</Button>
        <Typography color="error">Error loading invoice details.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/purchase')} color="inherit">Back</Button>
          <Typography variant="h5" fontWeight="bold">{doc.name}</Typography>
          <Chip label={doc.status} color={doc.status === 'Paid' ? 'success' : doc.status === 'Unpaid' ? 'error' : 'warning'} size="small" />
        </Box>
        <Button variant="outlined" startIcon={<Printer size={18} />} onClick={() => window.print()}>Print</Button>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Supplier Details</Typography>
            <Typography variant="h6" fontWeight="bold">{doc.supplier}</Typography>
            {doc.supplier_name && doc.supplier_name !== doc.supplier && (
              <Typography variant="body2" color="text.secondary">{doc.supplier_name}</Typography>
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
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 4, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Rate (₹)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Amount (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doc.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">{item.item_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.item_code}</Typography>
                  </TableCell>
                  <TableCell align="right">{item.qty}</TableCell>
                  <TableCell align="right">{item.rate}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>{item.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
