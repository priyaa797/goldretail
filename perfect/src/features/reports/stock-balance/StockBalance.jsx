import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Grid, MenuItem, Avatar, FormControlLabel, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, TablePagination, Autocomplete, createFilterOptions } from '@mui/material';
import BlankCard from '../../../components/shared/BlankCard';

import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';

import { useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';

const itemFilterOptions = createFilterOptions({
  stringify: (option) => `${option.item_code || ''} ${option.item_name || ''}`,
});

export default function StockBalance() {
  const [warehouse, setWarehouse] = useState('');
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [rows, setRows] = useState([]);

  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(0); // MUI TablePagination is 0-indexed
  const [ledgerTotal, setLedgerTotal] = useState(0);

  const { data: warehouses } = useFrappeGetDocList('Warehouse', { fields: ['name'], limit: 1000 });
  const { data: items } = useFrappeGetDocList('Item', { 
    fields: ['name', 'item_code', 'item_name', 'category', 'sub_category', 'type'], 
    limit: 10000 
  });
  const { data: categories } = useFrappeGetDocList('Item Category', { fields: ['name'], limit: 1000 });
  const { data: subCategories } = useFrappeGetDocList('Item Sub Category', { fields: ['name'], limit: 1000 });
  const { data: itemTypes } = useFrappeGetDocList('Item Type', { fields: ['name'], limit: 1000 });

  const { data: reportData, isLoading } = useFrappeGetCall('goldretail.api.reports.get_stock_balance', {
    warehouse: warehouse || undefined,
    item: item || undefined,
    category: category || undefined,
    sub_category: subCategory || undefined,
    type: itemType || undefined,
    show_zero_balance: showZeroBalance ? 1 : 0
  });

  // Available sub-categories based on selected category (if any)
  const availableSubCategories = useMemo(() => {
    if (!category || !items) return subCategories?.map(s => s.name) || [];
    const subsInCat = new Set(items.filter(i => i.category === category && i.sub_category).map(i => i.sub_category));
    if (subsInCat.size === 0) return subCategories?.map(s => s.name) || [];
    return Array.from(subsInCat).sort();
  }, [category, items, subCategories]);

  // Filtered items based on Category, Sub Category, and Type filters
  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(i => {
      if (category && i.category !== category) return false;
      if (subCategory && i.sub_category !== subCategory) return false;
      if (itemType && i.type !== itemType) return false;
      return true;
    });
  }, [items, category, subCategory, itemType]);

  // Reset subCategory if not in availableSubCategories
  useEffect(() => {
    if (subCategory && category && availableSubCategories.length > 0 && !availableSubCategories.includes(subCategory)) {
      setSubCategory('');
    }
  }, [category, availableSubCategories]);

  // Reset item if not in filteredItems
  useEffect(() => {
    if (item && filteredItems.length > 0 && !filteredItems.some(i => i.item_code === item)) {
      setItem('');
    }
  }, [category, subCategory, itemType, filteredItems]);

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

      <BlankCard><Box sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2.5} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <CustomTextField
              select
              fullWidth
              label="Warehouse Filter"
              value={warehouse}
              onChange={e => setWarehouse(e.target.value)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses?.map(w => <MenuItem key={w.name} value={w.name}>{w.name}</MenuItem>)}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              fullWidth
              options={filteredItems}
              filterOptions={itemFilterOptions}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.item_code || '')}
              isOptionEqualToValue={(option, value) => {
                const valCode = typeof value === 'string' ? value : value?.item_code;
                return option.item_code === valCode;
              }}
              value={filteredItems.find(i => i.item_code === item) || null}
              onChange={(event, newValue) => {
                setItem(newValue ? newValue.item_code : '');
              }}
              renderOption={(props, option) => {
                const { key, ...restProps } = props;
                return (
                  <li key={key} {...restProps} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 16px' }}>
                    <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                      {option.item_code}
                    </Typography>
                    {option.item_name && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                        {option.item_name}
                      </Typography>
                    )}
                  </li>
                );
              }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Item Filter"
                  placeholder="Search item code or name..."
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              fullWidth
              options={categories?.map(c => c.name) || []}
              value={category || null}
              onChange={(e, val) => setCategory(val || '')}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Category"
                  placeholder="All Categories"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              fullWidth
              options={availableSubCategories}
              value={subCategory || null}
              onChange={(e, val) => setSubCategory(val || '')}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Sub Category"
                  placeholder="All Sub Categories"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              fullWidth
              options={itemTypes?.map(t => t.name) || []}
              value={itemType || null}
              onChange={(e, val) => setItemType(val || '')}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  label="Type"
                  placeholder="All Types"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
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
      </Box></BlankCard>

      <BlankCard><Box sx={{ width: '100%', overflow: 'hidden' }}>
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
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Balance Carton</Typography></TableCell>
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
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.balance_carton != null ? row.balance_carton : '—'}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.stock_value}</Typography></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="subtitle2" py={3}>No stock balance data available</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box></BlankCard>

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
            <IconX size={20} />
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
                      <TableCell>{entry.voucher_type} <br /> <Typography variant="caption" color="textSecondary">{entry.voucher_no}</Typography></TableCell>
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
