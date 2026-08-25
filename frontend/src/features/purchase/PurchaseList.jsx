import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';

export default function PurchaseList() {
  const navigate = useNavigate();
  const { data, isLoading } = useFrappeGetDocList('Purchase Invoice', {
    fields: ['name', 'supplier', 'grand_total', 'posting_date', 'docstatus'],
    orderBy: { field: 'creation', order: 'desc' }
  });

  const columns = [
    { field: 'name', headerName: 'ID', width: 200 },
    { field: 'supplier', headerName: 'Supplier', flex: 1 },
    { 
      field: 'posting_date', 
      headerName: 'Date', 
      width: 150, 
      valueFormatter: (value) => value ? dayjs(value).format('DD MMM YYYY') : '' 
    },
    { field: 'grand_total', headerName: 'Total (₹)', width: 150 },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Purchase Invoices</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/purchase/new')}>New Purchase</Button>
      </Box>
      <Paper sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
        <DataGrid
          rows={data || []}
          columns={columns}
          getRowId={(row) => row.name}
          loading={isLoading}
          disableSelectionOnClick
          onRowClick={(params) => navigate(`/purchase/${params.row.name}`)}
          sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Paper>
    </Box>
  );
}
