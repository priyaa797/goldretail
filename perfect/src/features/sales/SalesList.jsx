import React from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip } from '@mui/material';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';

export default function SalesList() {
  const navigate = useNavigate();
  const { data, isLoading } = useFrappeGetDocList('Sales Invoice', {
    fields: ['name', 'customer', 'grand_total', 'posting_date', 'outstanding_amount', 'status'],
    orderBy: { field: 'creation', order: 'desc' }
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Sales Invoices</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/sales/new')}>New Sale</Button>
      </Box>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader aria-label="sales table">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>ID</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Customer</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Date</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Total (₹)</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Pending (₹)</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Status</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && data?.map((row) => (
                <TableRow hover key={row.name} onClick={() => navigate(`/sales/${row.name}`)} sx={{ cursor: 'pointer' }}>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.name}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.customer}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{dayjs(row.posting_date).format('DD MMM YYYY')}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.grand_total}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.outstanding_amount}</Typography></TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status} 
                      size="small" 
                      color={row.status === 'Paid' ? 'success' : row.status === 'Unpaid' ? 'error' : 'warning'} 
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center"><Typography variant="subtitle2" py={3}>No sales found</Typography></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
