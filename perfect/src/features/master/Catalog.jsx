import React, { useState } from 'react';
import {
  Box, Button, Typography, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Avatar, Checkbox, Grid, TextField, Autocomplete, FormControlLabel
} from '@mui/material';
import { useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Catalog() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Filters state
  const [category, setCategory] = useState(null);
  const [subCategory, setSubCategory] = useState(null);
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [priceList, setPriceList] = useState('Wholesale');
  const [discount, setDiscount] = useState('');

  const { data: categories } = useFrappeGetDocList('Item Category', { fields: ['name'], limit: 1000 });
  const { data: subCategories } = useFrappeGetDocList('Item Sub Category', { fields: ['name'], limit: 1000 });
  const { data: bins } = useFrappeGetDocList('Bin', { fields: ['item_code', 'actual_qty'], limit: 100000 });

  const queryFilters = [['disabled', '=', 0]];
  if (category) queryFilters.push(['category', '=', category]);
  if (subCategory) queryFilters.push(['sub_category', '=', subCategory]);

  // Fetch only active items based on category and sub_category filters
  const { data: items, isLoading } = useFrappeGetDocList('Item', {
    fields: ['name', 'item_code', 'item_name', 'description', 'image', 'category', 'sub_category'],
    filters: queryFilters,
    limit: 1000
  });

  const getStock = (item_code) => {
    if (!bins) return 0;
    return bins
      .filter(bin => bin.item_code === item_code)
      .reduce((sum, bin) => sum + bin.actual_qty, 0);
  };

  const filteredItems = items?.filter(item => {
    if (!showZeroStock && getStock(item.item_code) <= 0) {
      return false;
    }
    return true;
  });

  const { call: generatePdfCall, loading: generatingPdf } = useFrappePostCall('goldretail.api.catalog.generate_pdf');

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleSelectAll = (event) => {
    if (event.target.checked && filteredItems) {
      setSelectedItems(filteredItems.map(item => item.item_code));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelect = (item_code) => {
    setSelectedItems(prev => {
      if (prev.includes(item_code)) {
        return prev.filter(code => code !== item_code);
      } else {
        return [...prev, item_code];
      }
    });
  };

  const handleGeneratePdf = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    toast.promise(
      generatePdfCall({ item_codes: selectedItems, price_list: priceList, discount: parseFloat(discount) || 0.0 }),
      {
        loading: 'Generating PDF Catalogue...',
        success: (res) => {
          if (res.message) {
            // Force download the file by opening in new tab
            window.open(res.message, '_blank');
            return 'Catalogue generated successfully!';
          }
          throw new Error('No URL returned');
        },
        error: (err) => err.message || 'Error generating catalogue'
      }
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Catalog Generator</Typography>
        <Box display="flex" gap={2}>
          {!itemsLoaded ? (
            <Button
              variant="contained"
              onClick={() => {
                setItemsLoaded(true);
                if (filteredItems) {
                  setSelectedItems(filteredItems.map(item => item.item_code)); // auto select all when loaded
                }
              }}
            >
              Load Items
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<FileText size={18} />}
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              Create Catalogue
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Autocomplete
              options={categories?.map(c => c.name) || []}
              value={category}
              onChange={(e, val) => { setCategory(val); setItemsLoaded(false); }}
              renderInput={(params) => <TextField {...params} label="Category" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Autocomplete
              options={subCategories?.map(s => s.name) || []}
              value={subCategory}
              onChange={(e, val) => { setSubCategory(val); setItemsLoaded(false); }}
              renderInput={(params) => <TextField {...params} label="Sub Category" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Autocomplete
              options={['Wholesale', 'Retail']}
              value={priceList}
              onChange={(e, val) => { setPriceList(val || 'Wholesale'); setItemsLoaded(false); }}
              disableClearable
              renderInput={(params) => <TextField {...params} label="Price List" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Discount (%)"
              type="number"
              size="small"
              fullWidth
              inputProps={{ step: "0.1" }}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showZeroStock}
                  onChange={(e) => { setShowZeroStock(e.target.checked); setItemsLoaded(false); }}
                  color="primary"
                />
              }
              label="Show 0 stock item"
            />
          </Grid>
        </Grid>
      </Paper>

      {itemsLoaded && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
            <Table stickyHeader aria-label="catalog list table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedItems.length > 0 && selectedItems.length < filteredItems?.length}
                      checked={filteredItems?.length > 0 && selectedItems.length === filteredItems?.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Sr No</Typography></TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Code</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Name</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Description</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Category</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Sub Category</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!isLoading && filteredItems?.map((item, index) => {
                  const isSelected = selectedItems.includes(item.item_code);
                  return (
                    <TableRow
                      hover
                      key={item.name}
                      selected={isSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelect(item.item_code)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{index + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <a href={item.image || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          <Avatar
                            variant="rounded"
                            src={item.image}
                            alt={item.item_name}
                            sx={{ width: 64, height: 64, bgcolor: 'grey.100' }}
                          >
                            {!item.image && <Typography variant="caption" color="text.secondary">N/A</Typography>}
                          </Avatar>
                        </a>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={700}>{item.item_code}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.item_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }} title={stripHtml(item.description)}>
                          {stripHtml(item.description) || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.category || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.sub_category || '-'}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!filteredItems || filteredItems.length === 0) && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="subtitle2" py={3}>No active items found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
