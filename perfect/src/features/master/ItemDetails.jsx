import React from 'react';
import { Box, Button, Typography, Paper, Grid, Avatar, Divider, Chip } from '@mui/material';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { Edit2, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router';
import Spinner from '../../views/spinner/Spinner';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: item, isLoading, error } = useFrappeGetDoc('Item', id);

  if (isLoading) return <Spinner />;
  if (error) return <Typography color="error">Error loading item details.</Typography>;
  if (!item) return <Typography>No item found.</Typography>;

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/master/item')}>
            Back to List
          </Button>
          <Typography variant="h5" fontWeight="bold">Item: {item.item_name}</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Edit2 size={18} />} 
          onClick={() => navigate(`/master/item/${encodeURIComponent(item.name)}/edit`)}
        >
          Edit Item
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={2}>Overview</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Item Code</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{item.item_code}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Item Name</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{item.item_name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Item Group</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{item.item_group}</Typography>
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" mt={3}>Description</Typography>
            <Typography variant="body1" mt={1}>
              {stripHtml(item.description) || <Typography variant="body2" color="text.secondary" fontStyle="italic">No description provided.</Typography>}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Categorization</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Category</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{item.category || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Sub Category</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{item.sub_category || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Type</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{item.type || '-'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
            <Typography variant="h6" mb={2} textAlign="left">Item Image</Typography>
            <Box display="flex" justifyContent="center" mb={2}>
              <Avatar 
                variant="rounded" 
                src={item.image} 
                alt={item.item_name}
                sx={{ width: 150, height: 150, bgcolor: 'grey.100' }}
              >
                {!item.image && <Typography color="text.secondary">No Image</Typography>}
              </Avatar>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Settings</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Is Stock Item:</Typography>
                <Chip size="small" label={item.is_stock_item ? 'Yes' : 'No'} color={item.is_stock_item ? 'success' : 'default'} />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">GST HSN Code:</Typography>
                <Typography variant="body2" fontWeight="bold">{item.gst_hsn_code || '-'}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
