import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Divider } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import CustomSelect from '../../components/forms/theme-elements/CustomSelect';
import { MenuItem } from '@mui/material';

import { useFrappeCreateDoc, useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk';
import { useNavigate, useParams } from 'react-router';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import Spinner from '../../views/spinner/Spinner';

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = !!id;

  const { data: customer, isLoading: loadingCustomer } = useFrappeGetDoc('Customer', id, {
    is_active: isViewMode
  });

  const { call: getPartyContact, loading: loadingContact } = useFrappePostCall('goldretail.api.party.get_party_contact');

  const { createDoc: createCustomer, loading: savingCustomer } = useFrappeCreateDoc();
  const { createDoc: createContact, loading: savingContact } = useFrappeCreateDoc();

  const [formData, setFormData] = useState({
    customer_name: '',
    default_price_list: 'Retail',
    first_name: '',
    last_name: '',
    phone: ''
  });

  useEffect(() => {
    if (isViewMode && customer) {
      getPartyContact({ party_type: 'Customer', party_name: customer.name })
        .then((res) => {
          const contact = res ? res.message || res : null;
          setFormData({
            customer_name: customer.customer_name || '',
            default_price_list: customer.default_price_list || 'Retail',
            first_name: contact?.first_name || '',
            last_name: contact?.last_name || '',
            phone: contact?.phone || contact?.mobile_no || customer?.mobile_no || ''
          });
        })
        .catch((e) => {
          console.error(e);
          setFormData({
            customer_name: customer.customer_name || '',
            default_price_list: customer.default_price_list || 'Retail',
            first_name: '',
            last_name: '',
            phone: customer?.mobile_no || ''
          });
        });
    }
  }, [customer, isViewMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.customer_name || !formData.first_name) {
      alert("Customer Name and First Name are required.");
      return;
    }

    try {
      const custRes = await createCustomer('Customer', {
        customer_name: formData.customer_name,
        customer_type: 'Company',
        default_price_list: formData.default_price_list,
      });

      if (custRes && custRes.name) {
        await createContact('Contact', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_nos: [{ phone: formData.phone, is_primary_mobile_no: 1 }],
          is_primary_contact: 1,
          links: [{ link_doctype: 'Customer', link_name: custRes.name }]
        });
      }

      navigate('/master/customer');
    } catch (e) {
      console.error(e);
      alert("Error saving customer");
    }
  };

  if (isViewMode && (loadingCustomer || loadingContact)) return <Spinner />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/master/customer')}>
            Back to List
          </Button>
          <Typography variant="h5" fontWeight="bold">
            {isViewMode ? `Customer Details: ${customer?.customer_name}` : 'New Customer'}
          </Typography>
        </Box>
        {!isViewMode && (
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            disabled={savingCustomer || savingContact}
          >
            Save Customer
          </Button>
        )}
      </Box>

      <BlankCard><Box sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>Customer Info</Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight="600" mb={1}>Customer Name <span style={{ color: 'red' }}>*</span></Typography>
            <CustomTextField
              fullWidth
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight="600" mb={1}>Default Price List</Typography>
            <CustomSelect
              fullWidth
              name="default_price_list"
              value={formData.default_price_list}
              onChange={handleChange}
              disabled={isViewMode}
            >
              <MenuItem value="Wholesale">Wholesale</MenuItem>
              <MenuItem value="Retail">Retail</MenuItem>
            </CustomSelect>
          </Grid>
        </Grid>

        <Typography variant="h6" mb={2}>Primary Contact</Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" fontWeight="600" mb={1}>First Name <span style={{ color: 'red' }}>*</span></Typography>
            <CustomTextField
              fullWidth
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" fontWeight="600" mb={1}>Last Name</Typography>
            <CustomTextField
              fullWidth
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" fontWeight="600" mb={1}>Phone</Typography>
            <CustomTextField
              fullWidth
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={isViewMode}
            />
            {!isViewMode && (
              <Typography variant="caption" color="textSecondary">
                This will be saved as the primary mobile number.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Box></BlankCard>
    </Box>
  );
}
