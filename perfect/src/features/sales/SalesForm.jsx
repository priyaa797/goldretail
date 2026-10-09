import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid, MenuItem, IconButton, Table, TableContainer, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, createFilterOptions } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useFrappePostCall, useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { IconTrash, IconDeviceFloppy, IconCamera } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

const filterOptions = createFilterOptions({
  stringify: (option) => `${option.item_code} ${option.item_name || ''}`,
});

export default function SalesForm() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
  const [priceList, setPriceList] = useState('Wholesale');
  const [items, setItems] = useState([{ item_code: '', item_name: '', description: '', qty: '', rate: 0, user_rate: '', carton: '', packing: '', total_weight: '', discount: '' }]);
  const [transportationCharges, setTransportationCharges] = useState('');
  const [packagingCharges, setPackagingCharges] = useState('');

  const { data: customers } = useFrappeGetDocList('Customer', { fields: ['name', 'customer_group', 'default_price_list'], limit: 10000 });
  const { data: customerGroups } = useFrappeGetDocList('Customer Group', { fields: ['name', 'default_price_list'], limit: 1000 });
  const { data: itemListResponse } = useFrappeGetCall('goldretail.api.item_barcode.get_all_items');
  const itemList = itemListResponse?.message || [];

  const { data: itemPrices } = useFrappeGetDocList('Item Price', {
    fields: ['item_code', 'price_list_rate'],
    filters: [['price_list', '=', priceList]],
    limit: 100000
  });

  const getPrice = (itemCode) => {
    const priceDoc = itemPrices?.find(p => p.item_code === itemCode);
    return priceDoc ? priceDoc.price_list_rate : 0;
  };

  useEffect(() => {
    if (!itemPrices) return;
    setItems(prevItems => {
      let needsUpdate = false;
      const newItems = prevItems.map(item => {
        if (!item.item_code) return item;
        const priceDoc = itemPrices.find(p => p.item_code === item.item_code);
        const newRate = priceDoc ? priceDoc.price_list_rate : item.rate;
        if (newRate !== item.rate) {
          needsUpdate = true;
          return { ...item, rate: newRate };
        }
        return item;
      });
      return needsUpdate ? newItems : prevItems;
    });
  }, [itemPrices]);

  const { call } = useFrappePostCall('frappe.client.insert');
  const { call: getBarcodeItem } = useFrappePostCall('goldretail.api.item_barcode.get_item_by_barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);



  const processBarcode = async (barcode) => {
    if (!barcode) return;
    try {
      const res = await getBarcodeItem({ barcode_val: barcode });
      const itemData = res.message;
      if (itemData) {
        const existingIndex = items.findIndex(i => i.item_code === itemData.item_code);
        if (existingIndex >= 0) {
          toast.error(`Item ${itemData.item_code} is already added!`);
        } else {
          // find the full item data from our list to populate name and description
          const fullItem = itemList?.find(i => i.item_code === itemData.item_code);

          const newItem = {
            item_code: itemData.item_code,
            item_name: fullItem?.item_name || itemData.item_name || '',
            description: fullItem?.description || itemData.description || '',
            qty: '',
            rate: getPrice(itemData.item_code) || fullItem?.standard_rate || itemData.standard_rate || 0,
            user_rate: '',
            weight_per_unit: fullItem?.weight_per_unit || itemData.weight_per_unit || 0,
            packing: fullItem?.packing_from_item || itemData.packing_from_item || '',
            carton: '',
            total_weight: ''
          };

          if (items.length === 1 && items[0].item_code === '') {
            setItems([newItem]);
          } else {
            setItems([...items, newItem]);
          }
          toast.success(`Added ${itemData.item_code}`);
        }
      }
    } catch (error) {
      toast.error('Invalid barcode or item not found');
    }
  };

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = barcodeInput.trim();
      processBarcode(barcode);
      setBarcodeInput('');
    }
  };

  const handleSave = () => {
    // Validation
    if (!customer) {
      toast.error('Please select a customer');
      return;
    }
    const invalidItems = items.filter(i => !i.item_code || (Number(i.qty) || 0) <= 0 || (Number(i.user_rate) || Number(i.rate) || 0) <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have an Item Code, valid Quantity, and valid Rate.');
      return;
    }

    const doc = {
      doctype: 'Sales Invoice',
      customer,
      selling_price_list: priceList,
      items: items.map(i => {
        const qty = Number(i.qty) || 0;
        const baseRate = Number(i.user_rate) || Number(i.rate) || 0;
        const grossAmount = qty * baseRate;
        const discountPercentage = Number(i.discount) || 0;
        const discountAmt = grossAmount > 0 ? grossAmount * (discountPercentage / 100) : 0;

        return {
          item_code: i.item_code,
          qty: qty,
          price_list_rate: baseRate,
          discount_percentage: discountPercentage,
          description: i.description,
          carton: Number(i.carton) || 0,
          packing: Number(i.packing) || 0,
          total_weight: Number(i.total_weight) || 0
        };
      }),
      taxes_and_charges: `Output GST In-state - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`,
      taxes: [
        { charge_type: 'On Net Total', account_head: `Output Tax CGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: `Output Tax CGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}` },
        { charge_type: 'On Net Total', account_head: `Output Tax SGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: `Output Tax SGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}` },
        ...(Number(transportationCharges) > 0 ? [{ charge_type: 'Actual', account_head: `Transportation Charges - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: 'Transportation Charges', tax_amount: Number(transportationCharges) }] : []),
        ...(Number(packagingCharges) > 0 ? [{ charge_type: 'Actual', account_head: `Packaging Charges - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: 'Packaging Charges', tax_amount: Number(packagingCharges) }] : [])
      ],
      update_stock: 1, // Crucial for our simplified workflow
      docstatus: 1 // Try to submit immediately
    };

    toast.promise(
      call({ doc }),
      {
        loading: 'Saving Sales Invoice...',
        success: (res) => {
          navigate('/sales');
          return `Sales ${res.message.name} submitted successfully!`;
        },
        error: (err) => {
          let errorMsg = 'Error saving sales';
          if (err._server_messages) {
            try {
              const messages = JSON.parse(err._server_messages);
              const lastMsg = JSON.parse(messages[messages.length - 1]);
              if (lastMsg.message) {
                const doc = new DOMParser().parseFromString(lastMsg.message, 'text/html');
                errorMsg = doc.body.textContent || doc.body.innerText || errorMsg;
              }
            } catch (e) {
              errorMsg = err.message || errorMsg;
            }
          } else if (err.message) {
            errorMsg = err.message;
          }
          return errorMsg;
        }
      }
    );
  };

  const addItem = () => setItems([...items, { item_code: '', item_name: '', description: '', qty: '', rate: 0, user_rate: '', carton: '', packing: '', total_weight: '', discount: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">New Sale</Typography>
        <Button variant="contained" startIcon={<IconDeviceFloppy size={18} />} onClick={handleSave}>Save & Submit</Button>
      </Box>

      <BlankCard><Box sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <CustomTextField
              select
              fullWidth
              label="Customer"
              value={customer}
              onChange={e => {
                const val = e.target.value;
                setCustomer(val);
                const selectedCust = customers?.find(c => c.name === val);
                if (selectedCust) {
                  let pl = selectedCust.default_price_list;
                  if (!pl && selectedCust.customer_group) {
                    const group = customerGroups?.find(g => g.name === selectedCust.customer_group);
                    if (group && group.default_price_list) {
                      pl = group.default_price_list;
                    }
                  }
                  if (pl) {
                    setPriceList(pl);
                  }
                }
              }}
            >
              {customers?.map(s => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              select
              fullWidth
              label="Price List"
              value={priceList}
              onChange={e => setPriceList(e.target.value)}
            >
              <MenuItem value="Wholesale">Wholesale</MenuItem>
              <MenuItem value="Retail">Retail</MenuItem>
            </CustomTextField>
          </Grid>
        </Grid>
      </Box></BlankCard>

      <BlankCard><Box sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Items</Typography>
          <Box display="flex" gap={2}>
            <CustomTextField
              size="small"
              placeholder="Scan Barcode & Press Enter"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              sx={{ width: 300 }}
            />
            <Button variant="outlined" startIcon={<IconCamera size={18} />} onClick={() => setIsScannerOpen(true)}>
              Camera
            </Button>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 1600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60, minWidth: 60, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>#</TableCell>
                <TableCell sx={{ width: 185, minWidth: 185, position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 2, borderRight: '1px solid', borderColor: 'divider' }}>Item Code</TableCell>
                <TableCell sx={{ minWidth: 80 }}>Item Name</TableCell>
                <TableCell sx={{ width: 200, minWidth: 200 }}>Description</TableCell>
                <TableCell sx={{ width: 100 }}>Carton</TableCell>
                <TableCell sx={{ width: 100 }}>Packing</TableCell>
                <TableCell sx={{ width: 120 }}>Quantity</TableCell>
                <TableCell sx={{ width: 120 }}>Total Wt.</TableCell>
                <TableCell sx={{ width: 120 }}>Rate (System)</TableCell>
                <TableCell sx={{ width: 120 }}>Rate (User)</TableCell>
                <TableCell sx={{ width: 100 }}>Discount (%)</TableCell>
                <TableCell sx={{ width: 120 }}>Discount Amt</TableCell>
                <TableCell sx={{ width: 120 }}>Gross Amt</TableCell>
                <TableCell sx={{ width: 40, p: 0 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const rate = Number(item.user_rate) || Number(item.rate) || 0;
                const grossAmount = qty * rate;
                const discountPercentage = Number(item.discount) || 0;
                const discountAmt = grossAmount * (discountPercentage / 100);
                const taxableAmount = grossAmount - discountAmt;
                const gstAmt = taxableAmount * (Number(item.gst_percentage) || 0) / 100;
                const finalNetAmount = taxableAmount + gstAmt;

                return (
                  <TableRow key={idx}>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{idx + 1}</Typography>
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                      <Autocomplete
                        options={itemList || []}
                        filterOptions={filterOptions}
                        getOptionLabel={(option) => option.item_code || ''}
                        value={itemList?.find(i => i.item_code === item.item_code) || null}
                        renderOption={(props, option) => {
                          const { key, ...restProps } = props;
                          return (
                            <li key={key} {...restProps} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 16px' }}>
                              <Typography variant="body1" sx={{ lineHeight: 1.2 }}>{option.item_code}</Typography>
                              <Typography variant="caption" color="textSecondary">{option.item_name}</Typography>
                            </li>
                          );
                        }}
                        onChange={(e, newValue) => {
                          if (newValue) {
                            const existingIndex = items.findIndex((i, index) => i.item_code === newValue.item_code && index !== idx);
                            if (existingIndex >= 0) {
                              toast.error(`Item ${newValue.item_code} has already been added in row ${existingIndex + 1}!`);
                              return;
                            }
                          }

                          const newItems = [...items];
                          if (newValue) {
                            newItems[idx].item_code = newValue.item_code;
                            newItems[idx].item_name = newValue.item_name;
                            newItems[idx].description = newValue.description;
                            newItems[idx].rate = getPrice(newValue.item_code) || newValue.standard_rate || 0;
                            newItems[idx].user_rate = '';
                            newItems[idx].carton = '';
                            newItems[idx].packing = newValue.packing_from_item || '';
                            newItems[idx].weight_per_unit = newValue.weight_per_unit || 0;
                            newItems[idx].qty = '';
                            newItems[idx].total_weight = '';
                            newItems[idx].discount = '';
                            newItems[idx].gst_percentage = newValue.gst_percentage || 0;
                          } else {
                            newItems[idx].item_code = '';
                            newItems[idx].item_name = '';
                            newItems[idx].description = '';
                            newItems[idx].rate = 0;
                            newItems[idx].user_rate = '';
                            newItems[idx].carton = '';
                            newItems[idx].packing = '';
                            newItems[idx].weight_per_unit = 0;
                            newItems[idx].qty = '';
                            newItems[idx].total_weight = '';
                            newItems[idx].discount = '';
                            newItems[idx].gst_percentage = 0;
                          }
                          setItems(newItems);
                        }}
                        renderInput={(params) => <CustomTextField {...params} placeholder="Search Item..." variant="outlined" size="small" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.item_name || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" multiline maxRows={4} placeholder="Description" value={item.description || ''} onChange={e => {
                        const newItems = [...items];
                        newItems[idx].description = e.target.value;
                        setItems(newItems);
                      }} />
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" value={item.carton} disabled={!!item.qty && !item.carton} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].carton = val;
                          if (val || newItems[idx].packing) {
                            const newQty = (Number(val) || 0) * (Number(newItems[idx].packing) || 0);
                            newItems[idx].qty = newQty;
                            newItems[idx].total_weight = newQty * (Number(newItems[idx].weight_per_unit) || 0);
                          } else {
                            newItems[idx].qty = '';
                            newItems[idx].total_weight = '';
                          }
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.packing || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" value={item.qty} disabled={!!item.carton} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].qty = val;
                          newItems[idx].total_weight = (Number(val) || 0) * (Number(newItems[idx].weight_per_unit) || 0);
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.total_weight || ((Number(item.qty) || 0) * (Number(item.weight_per_unit) || 0)).toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">₹{(Number(item.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" placeholder="Rate..." value={item.user_rate} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].user_rate = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <CustomTextField size="small" placeholder="%" value={item.discount} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].discount = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>₹{discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>₹{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell sx={{ p: 0, textAlign: 'center' }}>
                      <IconButton color="error" onClick={() => removeItem(idx)}><IconTrash size={18} /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Button sx={{ mt: 2 }} onClick={addItem}>+ Add Row</Button>
      </Box></BlankCard>

      {(() => {
        const gstBreakup = {};
        let total = 0;
        let total_taxes = 0;
        let total_discount = 0;
        let grand_total = 0;

        items?.forEach(item => {
          const qty = Number(item.qty) || 0;
          const rate = Number(item.user_rate) || Number(item.rate) || 0;
          const grossAmount = qty * rate;
          const discountPercentage = Number(item.discount) || 0;
          const discountAmt = grossAmount > 0 ? grossAmount * (discountPercentage / 100) : 0;
          const taxableAmount = grossAmount - discountAmt;

          total += grossAmount;
          total_discount += discountAmt;

          const gst_percentage = Number(item.gst_percentage) || 0;
          if (gst_percentage > 0) {
            const cgstRate = gst_percentage / 2;
            const sgstRate = gst_percentage / 2;
            const cgstAmt = taxableAmount * (cgstRate / 100);
            const sgstAmt = taxableAmount * (sgstRate / 100);
            const totalTax = cgstAmt + sgstAmt;
            total_taxes += totalTax;

            if (!gstBreakup[gst_percentage]) {
              gstBreakup[gst_percentage] = { taxable: 0, cgst: 0, sgst: 0, total_tax: 0 };
            }
            gstBreakup[gst_percentage].taxable += taxableAmount;
            gstBreakup[gst_percentage].cgst += cgstAmt;
            gstBreakup[gst_percentage].sgst += sgstAmt;
            gstBreakup[gst_percentage].total_tax += totalTax;
          }
        });

        const transportChargeVal = Number(transportationCharges) || 0;
        const packingChargeVal = Number(packagingCharges) || 0;
        grand_total = total - total_discount + total_taxes + transportChargeVal + packingChargeVal;
        const rounded_total = Math.round(grand_total);
        const rounding_adjustment = rounded_total - grand_total;

        return (
          <>
            {Object.keys(gstBreakup).length > 0 && (
              <BlankCard><Box sx={{ mb: 4, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>GST Rate</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Taxable Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>CGST Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>SGST Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Tax</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(gstBreakup).map(([rate, data]) => (
                        <TableRow key={rate}>
                          <TableCell>{rate}%</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.taxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>₹{data.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box></BlankCard>
            )}

            <Box mb={4}>
              <BlankCard>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={3} sx={{ p: 3 }}>
                  <Box sx={{ width: { xs: '100%', md: '300px' } }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>Additional Charges</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <CustomTextField
                        fullWidth
                        label="Transportation Charges"
                        value={transportationCharges}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setTransportationCharges(val);
                          }
                        }}
                      />
                      <CustomTextField
                        fullWidth
                        label="Packaging Charges"
                        value={packagingCharges}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setPackagingCharges(val);
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '300px' } }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Total</Typography>
                  <Typography variant="body2">₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Box>
                {total_discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Total Discount</Typography>
                    <Typography variant="body2" color="error.main">-₹{total_discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Taxes</Typography>
                  <Typography variant="body2">₹{total_taxes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Box>
                {transportChargeVal > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Transportation Charges</Typography>
                    <Typography variant="body2">₹{transportChargeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </Box>
                )}
                {packingChargeVal > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Packaging Charges</Typography>
                    <Typography variant="body2">₹{packingChargeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight="bold">Grand Total</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">₹{grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Box>
                {rounding_adjustment !== 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Rounding Adjustment</Typography>
                    <Typography variant="body2">₹{rounding_adjustment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </Box>
                )}
                {rounded_total > 0 && rounded_total !== grand_total && (
                  <Box display="flex" justifyContent="space-between" mb={1} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Rounded Total</Typography>
                    <Typography variant="subtitle1" fontWeight="bold">₹{rounded_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </Box>
                )}
                  </Box>
                </Box>
              </BlankCard>
            </Box>
          </>
        );
      })()}

      <Dialog
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Scan Barcode</DialogTitle>
        <DialogContent>
          {isScannerOpen && <BarcodeScanner onScan={(text) => { setIsScannerOpen(false); processBarcode(text); }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsScannerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const BarcodeScanner = ({ onScan }) => {
  useEffect(() => {
    // Prevent double-initialization in React Strict Mode
    const readerElement = document.getElementById("reader");
    if (readerElement && readerElement.innerHTML !== "") {
      return;
    }

    const scanner = new Html5QrcodeScanner("reader", {
      qrbox: { width: 350, height: 150 }, // Optimized for wider 1D barcodes
      fps: 10, // Increased FPS for faster scanning
      rememberLastUsedCamera: true,
      supportedScanTypes: [0] // 0 = Camera only (avoids file upload clutter if unwanted, but we can leave it default)
    });

    scanner.render((decodedText) => {
      scanner.clear();
      if (onScan) onScan(decodedText);
    }, (error) => {
      // Ignore searching errors
    });

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [onScan]);

  return <Box id="reader" width="100%"></Box>;
};
