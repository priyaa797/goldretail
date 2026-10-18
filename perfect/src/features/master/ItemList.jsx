import React, { useState, useMemo, useEffect } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Avatar, Grid, Autocomplete, createFilterOptions, CircularProgress } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useFrappeGetDocList } from 'frappe-react-sdk';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

const itemFilterOptions = createFilterOptions({
  stringify: (option) => `${option.item_code || ''} ${option.item_name || ''}`,
});

export default function ItemList() {
  const navigate = useNavigate();

  const [selectedItem, setSelectedItem] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');

  // Fetch items with required fields
  const { data: items, isLoading } = useFrappeGetDocList('Item', {
    fields: ['name', 'item_code', 'item_name', 'description', 'image', 'category', 'sub_category', 'type'],
    limit: 10000
  });

  const { data: categories } = useFrappeGetDocList('Item Category', { fields: ['name'], limit: 1000 });
  const { data: subCategories } = useFrappeGetDocList('Item Sub Category', { fields: ['name'], limit: 1000 });
  const { data: itemTypes } = useFrappeGetDocList('Item Type', { fields: ['name'], limit: 1000 });

  // Available sub-categories based on selected category (if any)
  const availableSubCategories = useMemo(() => {
    if (!category || !items) return subCategories?.map(s => s.name) || [];
    const subsInCat = new Set(items.filter(i => i.category === category && i.sub_category).map(i => i.sub_category));
    if (subsInCat.size === 0) return subCategories?.map(s => s.name) || [];
    return Array.from(subsInCat).sort();
  }, [category, items, subCategories]);

  // Filtered item options for the Item Filter Autocomplete dropdown
  const filteredItemOptions = useMemo(() => {
    if (!items) return [];
    return items.filter(i => {
      if (category && i.category !== category) return false;
      if (subCategory && i.sub_category !== subCategory) return false;
      if (itemType && i.type !== itemType) return false;
      return true;
    });
  }, [items, category, subCategory, itemType]);

  // Filtered items to display in the table
  const displayedItems = useMemo(() => {
    if (!items) return [];
    return items.filter(i => {
      if (selectedItem && i.item_code !== selectedItem) return false;
      if (category && i.category !== category) return false;
      if (subCategory && i.sub_category !== subCategory) return false;
      if (itemType && i.type !== itemType) return false;
      return true;
    });
  }, [items, selectedItem, category, subCategory, itemType]);

  // Reset subCategory if not in availableSubCategories
  useEffect(() => {
    if (subCategory && category && availableSubCategories.length > 0 && !availableSubCategories.includes(subCategory)) {
      setSubCategory('');
    }
  }, [category, availableSubCategories]);

  // Reset item if not in filteredItemOptions
  useEffect(() => {
    if (selectedItem && filteredItemOptions.length > 0 && !filteredItemOptions.some(i => i.item_code === selectedItem)) {
      setSelectedItem('');
    }
  }, [category, subCategory, itemType, filteredItemOptions]);

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Item Master</Typography>
        <Button 
          variant="contained" 
          startIcon={<IconPlus size={18} />} 
          onClick={() => navigate('/master/item/new')}
        >
          New Item
        </Button>
      </Box>

      {/* Filters Section */}
      <BlankCard><Box sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2.5} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              fullWidth
              options={filteredItemOptions}
              filterOptions={itemFilterOptions}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.item_code || '')}
              isOptionEqualToValue={(option, value) => {
                const valCode = typeof value === 'string' ? value : value?.item_code;
                return option.item_code === valCode;
              }}
              value={filteredItemOptions.find(i => i.item_code === selectedItem) || null}
              onChange={(event, newValue) => {
                setSelectedItem(newValue ? newValue.item_code : '');
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
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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
        </Grid>
      </Box></BlankCard>

      <BlankCard><Box sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
          <Table stickyHeader aria-label="item list table">
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Code</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Name</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Description</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Category</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Sub Category</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Type</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && displayedItems.map((item) => (
                <TableRow 
                  hover 
                  key={item.name} 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/master/item/${encodeURIComponent(item.name)}`)}
                >
                  <TableCell>
                    <Avatar 
                      variant="rounded" 
                      src={item.image} 
                      alt={item.item_name}
                      sx={{ width: 48, height: 48, bgcolor: 'grey.100' }}
                    >
                      {!item.image && <Typography variant="caption" color="text.secondary">N/A</Typography>}
                    </Avatar>
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
                  <TableCell>
                    <Typography variant="body2">{item.type || '-'}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {(!displayedItems || displayedItems.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="subtitle2" py={3}>No items found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box></BlankCard>
    </Box>
  );
}
