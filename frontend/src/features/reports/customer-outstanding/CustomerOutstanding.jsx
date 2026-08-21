import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
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

  const columns = [
    { field: 'customer', headerName: 'Customer', flex: 1 },
    { 
      field: 'total_outstanding', 
      headerName: 'Total Pending (₹)', 
      width: 200,
      type: 'number',
      headerAlign: 'left',
      align: 'left'
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Customer Outstanding</Typography>
      </Box>
      <Paper sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          disableSelectionOnClick
          sx={{ border: 0 }}
        />
      </Paper>
    </Box>
  );
}
