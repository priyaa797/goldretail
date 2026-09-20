import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, Autocomplete, InputAdornment, IconButton } from '@mui/material';
import { useFrappeGetDocList, useFrappePostCall, useFrappeGetDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import { Save, Image as ImageIcon, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router';

export default function ItemForm() {
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    description: '',
    item_group: '',
    category: '',
    sub_category: '',
    type: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: existingItem, isLoading: isLoadingExisting } = useFrappeGetDoc('Item', id, {
    enabled: isEditMode
  });

  React.useEffect(() => {
    if (existingItem && isEditMode) {
      const stripHtml = (html) => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
      };

      setFormData({
        item_code: existingItem.item_code || '',
        item_name: existingItem.item_name || '',
        description: stripHtml(existingItem.description) || '',
        item_group: existingItem.item_group || '',
        category: existingItem.category || '',
        sub_category: existingItem.sub_category || '',
        type: existingItem.type || ''
      });
      if (existingItem.image) {
        setImagePreview(existingItem.image);
      }
    }
  }, [existingItem, isEditMode]);

  // Fetch Link Options
  const { data: itemGroups } = useFrappeGetDocList('Item Group', { fields: ['name'], limit: 1000 });
  const { data: categories } = useFrappeGetDocList('Item Category', { fields: ['name'], limit: 1000 });
  const { data: subCategories } = useFrappeGetDocList('Item Sub Category', { fields: ['name'], limit: 1000 });
  const { data: itemTypes } = useFrappeGetDocList('Item Type', { fields: ['name'], limit: 1000 });

  const { call: insertDoc } = useFrappePostCall('frappe.client.insert');
  const { updateDoc } = useFrappeUpdateDoc();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    setFormData({
      item_code: '',
      item_name: '',
      description: '',
      item_group: '',
      category: '',
      sub_category: '',
      type: ''
    });
    setImageFile(null);
    setImagePreview('');
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    
    const data = new FormData();
    data.append('file', imageFile, imageFile.name);
    data.append('is_private', 0);
    data.append('folder', 'Home/Attachments');

    try {
      const response = await fetch('/api/method/upload_file', {
        method: 'POST',
        body: data,
        // credentials: 'omit' because vite proxies it perfectly
      });
      const result = await response.json();
      if (result.message && result.message.file_url) {
        return result.message.file_url;
      } else {
        throw new Error('Image upload failed');
      }
    } catch (err) {
      console.error(err);
      throw new Error('Image upload failed');
    }
  };

  const handleSave = async () => {
    if (!formData.item_code || !formData.item_name || !formData.item_group) {
      toast.error('Item Code, Item Name, and Item Group are mandatory.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Creating Item...');

    try {
      let imageUrl = null;
      if (imageFile) {
        toast.loading('Uploading image...', { id: toastId });
        imageUrl = await uploadImage();
      }

      const docParams = {
        item_name: formData.item_name,
        description: formData.description,
        item_group: formData.item_group,
        category: formData.category,
        sub_category: formData.sub_category,
        type: formData.type,
      };
      
      if (imageUrl) docParams.image = imageUrl;

      if (isEditMode) {
        toast.loading('Updating item in Frappe...', { id: toastId });
        await updateDoc('Item', id, docParams);
        toast.success(`Item ${id} updated successfully!`, { id: toastId });
        navigate(`/master/item/${encodeURIComponent(id)}`);
      } else {
        toast.loading('Saving item to Frappe...', { id: toastId });
        const doc = {
          doctype: 'Item',
          item_code: formData.item_code,
          ...docParams,
          gst_hsn_code: '999999',
          is_stock_item: 1,
        };
        const res = await insertDoc({ doc });
        toast.success(`Item ${res.message.name} created successfully!`, { id: toastId });
        clearForm();
        navigate(`/master/item/${encodeURIComponent(res.message.name)}`);
      }
      
    } catch (err) {
      toast.error(err.message || 'Error saving item', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/master/item')}>
            Back to List
          </Button>
          <Typography variant="h5" fontWeight="bold">
            {isEditMode ? `Edit Item: ${id}` : 'New Item Master'}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Save size={18} />} 
          onClick={handleSave}
          disabled={isSubmitting || isLoadingExisting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Form Fields */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={3}>Basic Information</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Item Code *" 
                  value={formData.item_code}
                  disabled={isEditMode}
                  onChange={(e) => handleInputChange('item_code', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Item Name *" 
                  value={formData.item_name}
                  onChange={(e) => handleInputChange('item_name', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={itemGroups?.map(g => g.name) || []}
                  value={formData.item_group || null}
                  onChange={(e, val) => handleInputChange('item_group', val || '')}
                  renderInput={(params) => <TextField {...params} label="Item Group *" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={categories?.map(c => c.name) || []}
                  value={formData.category || null}
                  onChange={(e, val) => handleInputChange('category', val || '')}
                  renderInput={(params) => <TextField {...params} label="Category" />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={subCategories?.map(s => s.name) || []}
                  value={formData.sub_category || null}
                  onChange={(e, val) => handleInputChange('sub_category', val || '')}
                  renderInput={(params) => <TextField {...params} label="Sub Category" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={itemTypes?.map(t => t.name) || []}
                  value={formData.type || null}
                  onChange={(e, val) => handleInputChange('type', val || '')}
                  renderInput={(params) => <TextField {...params} label="Type" />}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  multiline 
                  rows={4}
                  label="Description" 
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Image Upload & Fixed Values Display */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={2}>Item Image</Typography>
            
            <Box 
              sx={{ 
                border: '2px dashed', 
                borderColor: 'divider', 
                borderRadius: 2, 
                p: 2, 
                textAlign: 'center',
                position: 'relative',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default'
              }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                  <IconButton 
                    size="small"
                    color="error"
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                    }}
                  >
                    <X size={16} />
                  </IconButton>
                </>
              ) : (
                <Box>
                  <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <Typography variant="body2" color="text.secondary" mb={2}>Upload item image</Typography>
                  <Button variant="outlined" component="label" size="small">
                    Select File
                    <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Fixed Settings</Typography>
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Is Stock Item:</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">Yes</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">GST HSN Code:</Typography>
                <Typography variant="body2" fontWeight="bold">999999</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
