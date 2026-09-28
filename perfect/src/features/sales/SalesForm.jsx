import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import { useFrappePostCall, useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { Trash2, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function SalesForm() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
  const [priceList, setPriceList] = useState('Wholesale');
  const [items, setItems] = useState([{ item_code: '', item_name: '', description: '', qty: '', rate: 0, user_rate: '', carton: '', packing: '', carton_weight: '', discount: '' }]);

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
            user_rate: ''
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
          carton_weight: Number(i.carton_weight) || 0
        };
      }),
      taxes_and_charges: 'Output GST In-state - KGF',
      taxes: [
        { charge_type: 'On Net Total', account_head: 'Output Tax CGST - KGF', description: 'Output Tax CGST - KGF' },
        { charge_type: 'On Net Total', account_head: 'Output Tax SGST - KGF', description: 'Output Tax SGST - KGF' }
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

  const addItem = () => setItems([...items, { item_code: '', item_name: '', description: '', qty: '', rate: 0, user_rate: '', carton: '', packing: '', carton_weight: '', discount: '' }]);
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
        <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave}>Save & Submit</Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
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
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Price List"
              value={priceList}
              onChange={e => setPriceList(e.target.value)}
            >
              <MenuItem value="Wholesale">Wholesale</MenuItem>
              <MenuItem value="Retail">Retail</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Items</Typography>
          <Box display="flex" gap={2}>
            <TextField
              size="small"
              placeholder="Scan Barcode & Press Enter"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              sx={{ width: 300 }}
            />
            <Button variant="outlined" startIcon={<Camera size={18} />} onClick={() => setIsScannerOpen(true)}>
              Camera
            </Button>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 2200 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60, minWidth: 60, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>S.No.</TableCell>
                <TableCell sx={{ width: 250, minWidth: 250, position: 'sticky', left: 60, bgcolor: 'background.paper', zIndex: 2, borderRight: '1px solid', borderColor: 'divider' }}>Item Code</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Item Name</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Description</TableCell>
                <TableCell sx={{ width: 100 }}>Carton</TableCell>
                <TableCell sx={{ width: 100 }}>Packing</TableCell>
                <TableCell sx={{ width: 120 }}>Quantity</TableCell>
                <TableCell sx={{ width: 120 }}>C. Wt.</TableCell>
                <TableCell sx={{ width: 120 }}>Rate (System)</TableCell>
                <TableCell sx={{ width: 120 }}>Rate (User)</TableCell>
                <TableCell sx={{ width: 120 }}>Gross Amt</TableCell>
                <TableCell sx={{ width: 100 }}>Discount (%)</TableCell>
                <TableCell sx={{ width: 120 }}>Discount Amt</TableCell>
                <TableCell sx={{ width: 100 }}>GST %</TableCell>
                <TableCell sx={{ width: 120 }}>GST Amt</TableCell>
                <TableCell sx={{ width: 120 }}>Net Amt</TableCell>
                <TableCell sx={{ width: 60 }}></TableCell>
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
                        getOptionLabel={(option) => option.item_code || ''}
                        value={itemList?.find(i => i.item_code === item.item_code) || null}
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
                            newItems[idx].packing = '';
                            newItems[idx].qty = '';
                            newItems[idx].carton_weight = '';
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
                            newItems[idx].qty = '';
                            newItems[idx].carton_weight = '';
                            newItems[idx].discount = '';
                            newItems[idx].gst_percentage = 0;
                          }
                          setItems(newItems);
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Search Item..." variant="outlined" size="small" />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.item_name || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" multiline maxRows={2} placeholder="Description" value={item.description || ''} onChange={e => {
                        const newItems = [...items];
                        newItems[idx].description = e.target.value;
                        setItems(newItems);
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={item.carton} disabled={!!item.qty && !item.carton && !item.packing} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].carton = val;
                          if (val || newItems[idx].packing) {
                            newItems[idx].qty = (Number(val) || 0) * (Number(newItems[idx].packing) || 0);
                          }
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={item.packing} disabled={!!item.qty && !item.carton && !item.packing} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].packing = val;
                          if (newItems[idx].carton || val) {
                            newItems[idx].qty = (Number(newItems[idx].carton) || 0) * (Number(val) || 0);
                          }
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={item.qty} disabled={!!item.carton || !!item.packing} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].qty = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={item.carton_weight} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].carton_weight = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={item.rate} InputProps={{ readOnly: true }} sx={{ bgcolor: 'action.hover' }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" placeholder="Rate..." value={item.user_rate} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].user_rate = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>₹{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <TextField size="small" placeholder="%" value={item.discount} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                          const newItems = [...items];
                          newItems[idx].discount = val;
                          setItems(newItems);
                        }
                      }} />
                    </TableCell>
                    <TableCell>₹{discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{item.gst_percentage || 0}%</TableCell>
                    <TableCell>₹{gstAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>₹{finalNetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => removeItem(idx)}><Trash2 size={18} /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Button sx={{ mt: 2 }} onClick={addItem}>+ Add Row</Button>
      </Paper>

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
