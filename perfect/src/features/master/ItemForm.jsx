import React, { useState } from 'react';
import { Box, Button, Typography, Grid, Autocomplete, InputAdornment, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useFrappeGetDocList, useFrappePostCall, useFrappeGetDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import { IconDeviceFloppy, IconPhoto as ImageIcon, IconX, IconArrowLeft } from '@tabler/icons-react';
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
    type: '',
    wholesale_price: '',
    retail_price: '',
    weight_per_unit: '',
    weight_uom: 'Nos',
    nos_per_carton: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricesInitialized, setPricesInitialized] = useState(false);

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

      setFormData(prev => ({
        ...prev,
        item_code: existingItem.item_code || '',
        item_name: existingItem.item_name || '',
        description: stripHtml(existingItem.description) || '',
        item_group: existingItem.item_group || '',
        category: existingItem.category || '',
        sub_category: existingItem.sub_category || '',
        type: existingItem.type || '',
        weight_per_unit: existingItem.weight_per_unit || '',
        weight_uom: existingItem.weight_uom || 'Nos',
        nos_per_carton: existingItem.uoms?.find(u => u.uom === 'Carton')?.conversion_factor || ''
      }));
      if (existingItem.image) {
        setImagePreview(existingItem.image);
      }
    }
  }, [existingItem, isEditMode]);

  const { data: itemGroups } = useFrappeGetDocList('Item Group', { fields: ['name'], limit: 1000 });
  const { data: categories } = useFrappeGetDocList('Item Category', { fields: ['name'], limit: 1000 });
  const { data: subCategories } = useFrappeGetDocList('Item Sub Category', { fields: ['name'], limit: 1000 });
  const { data: itemTypes } = useFrappeGetDocList('Item Type', { fields: ['name'], limit: 1000 });

  const { data: itemPrices } = useFrappeGetDocList('Item Price', {
    fields: ['price_list', 'price_list_rate'],
    filters: [['item_code', '=', id || '']],
    limit: 10
  });

  React.useEffect(() => {
    if (isEditMode && itemPrices && !pricesInitialized) {
      const wp = itemPrices.find(p => p.price_list === 'Wholesale')?.price_list_rate || '';
      const rp = itemPrices.find(p => p.price_list === 'Retail')?.price_list_rate || '';
      setFormData(prev => ({
        ...prev,
        wholesale_price: wp,
        retail_price: rp
      }));
      setPricesInitialized(true);
    }
  }, [itemPrices, isEditMode, pricesInitialized]);

  const { call: insertDoc } = useFrappePostCall('frappe.client.insert');
  const { call: setPriceCall } = useFrappePostCall('goldretail.api.item_price.set_item_price');
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
      type: '',
      wholesale_price: '',
      retail_price: '',
      weight_per_unit: '',
      weight_uom: 'Nos',
      nos_per_carton: ''
    });
    setImageFile(null);
    setImagePreview('');
    setPricesInitialized(false);
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
        weight_per_unit: parseFloat(formData.weight_per_unit) || 0,
        weight_uom: formData.weight_uom || 'Nos',
        stock_uom: 'Nos',
      };

      if (formData.nos_per_carton) {
        docParams.uoms = [
          { uom: 'Nos', conversion_factor: 1 },
          { uom: 'Carton', conversion_factor: parseFloat(formData.nos_per_carton) }
        ];
      } else {
        docParams.uoms = [
          { uom: 'Nos', conversion_factor: 1 }
        ];
      }

      if (imageUrl) docParams.image = imageUrl;

      const savePrices = async (itemCode) => {
        const uom = existingItem?.stock_uom || 'Nos';
        if (formData.wholesale_price && parseFloat(formData.wholesale_price) > 0) {
          try {
            await setPriceCall({
              item_code: itemCode,
              amount: formData.wholesale_price,
              uom: uom,
              price_list: 'Wholesale'
            });
          } catch (e) {
            console.error("Failed to set wholesale price", e);
          }
        }
        if (formData.retail_price && parseFloat(formData.retail_price) > 0) {
          try {
            await setPriceCall({
              item_code: itemCode,
              amount: formData.retail_price,
              uom: uom,
              price_list: 'Retail'
            });
          } catch (e) {
            console.error("Failed to set retail price", e);
          }
        }
      };

      if (isEditMode) {
        toast.loading('Updating item in Frappe...', { id: toastId });
        await updateDoc('Item', id, docParams);
        await savePrices(id);
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
        await savePrices(res.message.name);
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
          <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/master/item')}>
            Back to List
          </Button>
          <Typography variant="h5" fontWeight="bold">
            {isEditMode ? `Edit Item: ${id}` : 'New Item Master'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconDeviceFloppy size={18} />}
          onClick={handleSave}
          disabled={isSubmitting || isLoadingExisting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Form Fields */}
        <Grid item xs={12} md={8}>
          <BlankCard><Box  sx={{ p: 3 }}>
            <Typography variant="h6" mb={3}>Basic Information</Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  label="Item Code *"
                  value={formData.item_code}
                  disabled={isEditMode}
                  onChange={(e) => handleInputChange('item_code', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
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
                  renderInput={(params) => <CustomTextField {...params} label="Item Group *" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={categories?.map(c => c.name) || []}
                  value={formData.category || null}
                  onChange={(e, val) => handleInputChange('category', val || '')}
                  renderInput={(params) => <CustomTextField {...params} label="Category" />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={subCategories?.map(s => s.name) || []}
                  value={formData.sub_category || null}
                  onChange={(e, val) => handleInputChange('sub_category', val || '')}
                  renderInput={(params) => <CustomTextField {...params} label="Sub Category" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={itemTypes?.map(t => t.name) || []}
                  value={formData.type || null}
                  onChange={(e, val) => handleInputChange('type', val || '')}
                  renderInput={(params) => <CustomTextField {...params} label="Type" />}
                />
              </Grid>

              <Grid item xs={12}>
                <CustomTextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  label="Per Piece Weight"
                  type="number"
                  value={formData.weight_per_unit}
                  onChange={(e) => handleInputChange('weight_per_unit', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  label="Nos per Carton"
                  type="number"
                  value={formData.nos_per_carton}
                  onChange={(e) => handleInputChange('nos_per_carton', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box></BlankCard>
        </Grid>

        {/* Right Column - Image Upload & Fixed Values Display */}
        <Grid item xs={12} md={4}>
          <BlankCard><Box  sx={{ p: 3, mb: 3 }}>
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
                    <IconX size={16} />
                  </IconButton>
                </>
              ) : (
                <Box>
                  <IconPhoto size={48} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <Typography variant="body2" color="text.secondary" mb={2}>Upload item image</Typography>
                  <Button variant="outlined" component="label" size="small">
                    Select File
                    <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                  </Button>
                </Box>
              )}
            </Box>
          </Box></BlankCard>

          <BlankCard><Box  sx={{ p: 3 }}>
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
          </Box></BlankCard>


          <BlankCard><Box  sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" mb={2}>Pricing</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <CustomTextField
                label="Wholesale Price"
                type="number"
                fullWidth
                size="small"
                value={formData.wholesale_price || ''}
                onChange={e => handleInputChange('wholesale_price', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  sx: { color: 'warning.main', fontWeight: 'bold' }
                }}
              />
              <CustomTextField
                label="Retail Price"
                type="number"
                fullWidth
                size="small"
                value={formData.retail_price || ''}
                onChange={e => handleInputChange('retail_price', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  sx: { color: 'success.main', fontWeight: 'bold' }
                }}
              />
            </Box>
          </Box></BlankCard>
        </Grid>
      </Grid>
    </Box>
  );
}
