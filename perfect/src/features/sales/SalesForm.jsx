import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { Trash2, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function SalesForm() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([{ item_code: '', qty: 1, rate: 0, user_rate: '' }]);

  const { data: customers } = useFrappeGetDocList('Customer', { fields: ['name'] });
  const { data: itemList } = useFrappeGetDocList('Item', { fields: ['name', 'item_code', 'item_name', 'description', 'standard_rate'] });


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
            qty: 1,
            rate: fullItem?.standard_rate || itemData.standard_rate || 0,
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
      items: items.map(i => ({ item_code: i.item_code, qty: Number(i.qty) || 0, rate: Number(i.user_rate) || Number(i.rate) || 0 })),
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
        error: (err) => err.message || 'Error saving sales'
      }
    );
  };

  const addItem = () => setItems([...items, { item_code: '', item_name: '', description: '', qty: 1, rate: 0 }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <Box>
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
              onChange={e => setCustomer(e.target.value)}
            >
              {customers?.map(s => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 50 }}>S.No.</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Item Code</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Item Name</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Description</TableCell>
              <TableCell sx={{ width: 120 }}>Quantity</TableCell>
              <TableCell sx={{ width: 120 }}>Rate (System)</TableCell>
              <TableCell sx={{ width: 120 }}>Rate (User)</TableCell>
              <TableCell sx={{ width: 120 }}>Amount</TableCell>
              <TableCell sx={{ width: 60 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{idx + 1}</Typography>
                </TableCell>
                <TableCell>
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
                        newItems[idx].rate = newValue.standard_rate || 0;
                        newItems[idx].user_rate = '';
                      } else {
                        newItems[idx].item_code = '';
                        newItems[idx].item_name = '';
                        newItems[idx].description = '';
                        newItems[idx].rate = 0;
                        newItems[idx].user_rate = '';
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
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }} title={stripHtml(item.description)}>
                    {stripHtml(item.description) || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={item.qty}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        const newItems = [...items];
                        newItems[idx].qty = val;
                        setItems(newItems);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={item.rate}
                    InputProps={{ readOnly: true }}
                    sx={{ bgcolor: 'action.hover' }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Rate..."
                    value={item.user_rate}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const newItems = [...items];
                        newItems[idx].user_rate = val;
                        setItems(newItems);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>₹{(Number(item.qty) || 0) * (Number(item.user_rate) || Number(item.rate) || 0)}</TableCell>
                <TableCell>
                  <IconButton color="error" onClick={() => removeItem(idx)}><Trash2 size={18} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
