import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, MenuItem, Avatar, FormControlLabel, Checkbox } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { ExternalLink } from 'lucide-react';

export default function StockBalance() {
  const [warehouse, setWarehouse] = useState('');
  const [item, setItem] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [rows, setRows] = useState([]);

  const { data: warehouses } = useFrappeGetDocList('Warehouse', { fields: ['name'] });
  const { data: items } = useFrappeGetDocList('Item', { fields: ['name', 'item_code'] });

  const { data: reportData, isLoading } = useFrappeGetCall('goldretail.api.reports.get_stock_balance', {
    warehouse: warehouse || undefined,
    item: item || undefined,
    show_zero_balance: showZeroBalance ? 1 : 0
  });

  useEffect(() => {
    if (reportData && reportData.message) {
      setRows(reportData.message);
    } else {
      setRows([]);
    }
  }, [reportData]);

  const columns = [
    {
      field: 'image',
      headerName: 'Image',
      width: 80,
      renderCell: (params) => {
        if (!params.value) return null;
        // Frappe images are usually relative paths like /files/image.jpg
        return (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%" width="100%">
            <Avatar
              src={params.value}
              variant="rounded"
              sx={{ width: 40, height: 40, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}
              onClick={() => window.open(params.value, '_blank')}
            />
          </Box>
        );
      }
    },
    {
      field: 'item_code',
      headerName: 'Item Code',
      flex: 1,
      renderCell: (params) => (
        <span style={{ fontWeight: 700 }}>{params.row.item_code}</span>
      )
    },
    {
      field: 'item_name',
      headerName: 'Item Name',
      flex: 1.5
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      valueFormatter: (value) => {
        if (!value) return '-';
        const doc = new DOMParser().parseFromString(value, 'text/html');
        return doc.body.textContent || "-";
      }
    },
    { field: 'warehouse', headerName: 'Warehouse', flex: 1 },
    { field: 'in_qty', headerName: 'In Qty', width: 120, type: 'number' },
    { field: 'out_qty', headerName: 'Out Qty', width: 120, type: 'number' },
    { field: 'actual_qty', headerName: 'Balance Qty', width: 120, type: 'number' },
    { field: 'stock_value', headerName: 'Value (₹)', width: 130, type: 'number' },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Typography variant="h4" fontWeight="800">Stock Balance</Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Warehouse Filter"
              value={warehouse}
              onChange={e => setWarehouse(e.target.value)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses?.map(w => <MenuItem key={w.name} value={w.name}>{w.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Item Filter"
              value={item}
              onChange={e => setItem(e.target.value)}
            >
              <MenuItem value="">All Items</MenuItem>
              {items?.map(i => <MenuItem key={i.item_code} value={i.item_code}>{i.item_code}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showZeroBalance}
                  onChange={e => setShowZeroBalance(e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography fontWeight="600" color="text.secondary">Show 0 balance items</Typography>}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ height: 'calc(100vh - 300px)', width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          slots={{ toolbar: GridToolbar }}
          disableSelectionOnClick
          rowHeight={60}
        />
      </Paper>
    </Box>
  );
}
