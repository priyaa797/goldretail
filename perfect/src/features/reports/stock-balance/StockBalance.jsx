import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, MenuItem, Avatar, FormControlLabel, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, TableContainer } from '@mui/material';
import { useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';

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

  const stripHtml = (html) => {
    if (!html) return '-';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "-";
  };

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

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader aria-label="stock balance table">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Image</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Code</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Name</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Description</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Warehouse</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>In Qty</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Out Qty</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Balance Qty</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Value (₹)</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && rows.map((row, idx) => (
                <TableRow hover key={idx}>
                  <TableCell>
                    {row.image && (
                      <Avatar
                        src={row.image}
                        variant="rounded"
                        sx={{ width: 40, height: 40, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}
                        onClick={() => window.open(row.image, '_blank')}
                      />
                    )}
                  </TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={700}>{row.item_code}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.item_name}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{stripHtml(row.description)}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.warehouse}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.in_qty}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.out_qty}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.actual_qty}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.stock_value}</Typography></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="subtitle2" py={3}>No stock balance data available</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
