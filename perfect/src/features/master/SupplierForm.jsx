import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Divider } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useFrappeCreateDoc, useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk';
import { useNavigate, useParams } from 'react-router';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import Spinner from '../../views/spinner/Spinner';

export default function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewMode = !!id;

  const { data: supplier, isLoading: loadingSupplier } = useFrappeGetDoc('Supplier', id, {
    is_active: isViewMode
  });

  const { call: getPartyContact, loading: loadingContact } = useFrappePostCall('goldretail.api.party.get_party_contact');

  const { createDoc: createSupplier, loading: savingSupplier } = useFrappeCreateDoc();
  const { createDoc: createContact, loading: savingContact } = useFrappeCreateDoc();

  const [formData, setFormData] = useState({
    supplier_name: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  useEffect(() => {
    if (isViewMode && supplier) {
      getPartyContact({ party_type: 'Supplier', party_name: supplier.name })
        .then((res) => {
          const contact = res ? res.message || res : null;
          setFormData({
            supplier_name: supplier.supplier_name || '',
            first_name: contact?.first_name || '',
            last_name: contact?.last_name || '',
            phone: contact?.phone || contact?.mobile_no || ''
          });
        })
        .catch((e) => {
          console.error(e);
          setFormData({
            supplier_name: supplier.supplier_name || '',
            first_name: '',
            last_name: '',
            phone: ''
          });
        });
    }
  }, [supplier, isViewMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.supplier_name || !formData.first_name) {
      alert("Supplier Name and First Name are required.");
      return;
    }

    try {
      const suppRes = await createSupplier('Supplier', {
        supplier_name: formData.supplier_name,
      });

      if (suppRes && suppRes.name) {
        await createContact('Contact', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_nos: [{ phone: formData.phone, is_primary_mobile_no: 1 }],
          is_primary_contact: 1,
          links: [{ link_doctype: 'Supplier', link_name: suppRes.name }]
        });
      }

      navigate('/master/supplier');
    } catch (e) {
      console.error(e);
      alert("Error saving supplier");
    }
  };

  if (isViewMode && (loadingSupplier || loadingContact)) return <Spinner />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<IconArrowLeft size={18} />} onClick={() => navigate('/master/supplier')}>
            Back to List
          </Button>
          <Typography variant="h5" fontWeight="bold">
            {isViewMode ? `Supplier Details: ${supplier?.supplier_name}` : 'New Supplier'}
          </Typography>
        </Box>
        {!isViewMode && (
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            disabled={savingSupplier || savingContact}
          >
            Save Supplier
          </Button>
        )}
      </Box>

      <BlankCard><Box sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>Supplier Info</Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight="600" mb={1}>Supplier Name <span style={{ color: 'red' }}>*</span></Typography>
            <CustomTextField
              fullWidth
              name="supplier_name"
              value={formData.supplier_name}
              onChange={handleChange}
              disabled={isViewMode}
            />
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
