import React from 'react';
import { 
  Box, Button, Typography, Paper, 
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Avatar
} from '@mui/material';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function ItemList() {
  const navigate = useNavigate();

  // Fetch items with required fields
  const { data: items, isLoading } = useFrappeGetDocList('Item', {
    fields: ['name', 'item_code', 'item_name', 'description', 'image', 'category', 'sub_category', 'type'],
    limit: 1000
  });

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
          startIcon={<Plus size={18} />} 
          onClick={() => navigate('/master/item/new')}
        >
          New Item
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
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
              {!isLoading && items?.map((item) => (
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
              {(!items || items.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="subtitle2" py={3}>No items found</Typography>
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
