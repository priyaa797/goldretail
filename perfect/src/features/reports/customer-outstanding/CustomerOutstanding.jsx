import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableContainer } from '@mui/material';
import { useFrappeGetCall } from 'frappe-react-sdk';

export default function CustomerOutstanding() {
  const { data: res, isLoading } = useFrappeGetCall('goldretail.api.payments.payment_allocator.get_customer_outstanding');
  
  const data = React.useMemo(() => {
    if (res && res.message) {
      return res.message.map((row) => ({
        id: row.customer,
        customer: row.customer,
        total_outstanding: row.total_outstanding
      }));
    }
    return [];
  }, [res]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Customer Outstanding</Typography>
      </Box>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader aria-label="customer outstanding table">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Customer</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Total Pending (₹)</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && data.map((row) => (
                <TableRow hover key={row.id}>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.customer}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary" fontWeight={600}>{row.total_outstanding.toLocaleString()}</Typography></TableCell>
                </TableRow>
              ))}
              {data.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={2} align="center"><Typography variant="subtitle2" py={3}>No outstanding balances found</Typography></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
