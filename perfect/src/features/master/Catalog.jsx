import React, { useState } from 'react';
import { 
  Box, Button, Typography, Paper, 
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Avatar, Checkbox
} from '@mui/material';
import { useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Catalog() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Fetch only active items
  const { data: items, isLoading } = useFrappeGetDocList('Item', {
    fields: ['name', 'item_code', 'item_name', 'description', 'image', 'category', 'sub_category'],
    filters: [['disabled', '=', 0]],
    limit: 1000
  });

  const { call: generatePdfCall, loading: generatingPdf } = useFrappePostCall('goldretail.api.catalog.generate_pdf');

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedItems(items.map(item => item.item_code));
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
      generatePdfCall({ item_codes: selectedItems }),
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
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Catalog Generator</Typography>
        <Box display="flex" gap={2}>
          {!itemsLoaded ? (
            <Button 
              variant="contained" 
              onClick={() => {
                setItemsLoaded(true);
                if (items) {
                    setSelectedItems(items.map(item => item.item_code)); // auto select all when loaded
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

      {itemsLoaded && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table stickyHeader aria-label="catalog list table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedItems.length > 0 && selectedItems.length < items?.length}
                      checked={items?.length > 0 && selectedItems.length === items?.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Code</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Item Name</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Description</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Category</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Sub Category</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!isLoading && items?.map((item) => {
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
                {(!items || items.length === 0) && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
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
