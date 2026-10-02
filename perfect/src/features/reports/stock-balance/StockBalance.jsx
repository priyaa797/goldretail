import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, MenuItem, Avatar, FormControlLabel, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, TablePagination } from '@mui/material';
import { useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { X } from 'lucide-react';
import dayjs from 'dayjs';

export default function StockBalance() {
  const [warehouse, setWarehouse] = useState('');
  const [item, setItem] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [rows, setRows] = useState([]);
  
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(0); // MUI TablePagination is 0-indexed
  const [ledgerTotal, setLedgerTotal] = useState(0);

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

  const handleRowClick = async (item_code, warehouse, balance_qty) => {
    setLedgerModalOpen(true);
    setSelectedLedgerItem({ item_code, warehouse, balance_qty });
    setLedgerPage(0);
    fetchLedgerData(item_code, warehouse, 1);
  };

  const fetchLedgerData = async (item_code, warehouse, page) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/method/goldretail.api.reports.get_item_ledger?item_code=${encodeURIComponent(item_code)}&warehouse=${encodeURIComponent(warehouse)}&page=${page}&page_size=20`);
      const data = await res.json();
      if (data.message) {
        setLedgerData(data.message.data || []);
        setLedgerTotal(data.message.total_count || 0);
      } else {
        setLedgerData([]);
        setLedgerTotal(0);
      }
    } catch (e) {
      console.error(e);
      setLedgerData([]);
      setLedgerTotal(0);
    }
    setLoadingLedger(false);
  };

  const handleChangePage = (event, newPage) => {
    setLedgerPage(newPage);
    if (selectedLedgerItem) {
      fetchLedgerData(selectedLedgerItem.item_code, selectedLedgerItem.warehouse, newPage + 1);
    }
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
                <TableRow 
                  hover 
                  key={idx} 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(row.item_code, row.warehouse, row.actual_qty)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
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

      {/* Ledger Modal */}
      <Dialog 
        open={ledgerModalOpen} 
        onClose={() => setLedgerModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Stock Ledger: {selectedLedgerItem?.item_code}
            </Typography>
            {selectedLedgerItem?.balance_qty !== undefined && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Current Balance Qty: <strong>{selectedLedgerItem.balance_qty}</strong>
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setLedgerModalOpen(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingLedger ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><Typography fontWeight="bold">Date</Typography></TableCell>
                    <TableCell><Typography fontWeight="bold">Voucher</Typography></TableCell>
                    <TableCell><Typography fontWeight="bold">Customer / Supplier</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight="bold">In</Typography></TableCell>
                    <TableCell align="right"><Typography fontWeight="bold">Out</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerData.length > 0 ? ledgerData.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell>{dayjs(entry.posting_date).format('DD MMM YYYY')}</TableCell>
                      <TableCell>{entry.voucher_type} <br/> <Typography variant="caption" color="textSecondary">{entry.voucher_no}</Typography></TableCell>
                      <TableCell>{entry.party}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: entry.in_qty > 0 ? 'bold' : 'normal' }}>
                        {entry.in_qty > 0 ? entry.in_qty : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: entry.out_qty > 0 ? 'bold' : 'normal' }}>
                        {entry.out_qty > 0 ? entry.out_qty : '-'}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" py={3}>No ledger entries found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <TablePagination
            component="div"
            count={ledgerTotal}
            page={ledgerPage}
            onPageChange={handleChangePage}
            rowsPerPage={20}
            rowsPerPageOptions={[20]}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
