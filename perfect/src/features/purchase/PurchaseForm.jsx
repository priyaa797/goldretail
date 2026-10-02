import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import { useFrappePostCall, useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { Trash2, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function PurchaseForm() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [items, setItems] = useState([{ item_code: '', item_name: '', description: '', qty: '', rate: 0, carton: '', packing: '', carton_weight: '', discount: '' }]);

  const { data: suppliers } = useFrappeGetDocList('Supplier', { fields: ['name'] });
  const { data: itemListResponse, mutate: mutateItemList } = useFrappeGetCall('goldretail.api.item_barcode.get_all_items');
  const itemList = itemListResponse?.message || [];

  const { call: insertDoc } = useFrappePostCall('frappe.client.insert');
  const { call: getBarcodeItem } = useFrappePostCall('goldretail.api.item_barcode.get_item_by_barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [newItemData, setNewItemData] = useState({ item_code: '', item_name: '' });
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  useEffect(() => {
    // Watch for carton and packing changes and update qty automatically
    setItems(currentItems => currentItems.map(item => {
      if (item.carton || item.packing) {
        const carton = Number(item.carton) || 0;
        const packing = Number(item.packing) || 0;
        const newQty = carton * packing;
        if (newQty !== Number(item.qty)) {
          return { ...item, qty: newQty };
        }
      }
      return item;
    }));
  }, [JSON.stringify(items.map(i => ({ c: i.carton, p: i.packing })))]);

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
            rate: itemData.rate || 0
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
    if (!supplier) {
      toast.error('Please select a supplier');
      return;
    }
    if (!billNo) {
      toast.error('Please enter Supplier Invoice No (Bill No)');
      return;
    }
    const invalidItems = items.filter(i => !i.item_code || (Number(i.qty) || 0) <= 0 || (Number(i.rate) || 0) <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have an Item Code, valid Quantity, and valid Rate.');
      return;
    }

    const doc = {
      doctype: 'Purchase Invoice',
      supplier,
      bill_no: billNo,
      items: items.map(i => {
        const qty = Number(i.qty) || 0;
        const baseRate = Number(i.rate) || 0;
        const grossAmount = qty * baseRate;
        const discountPercentage = Number(i.discount) || 0;

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
      taxes_and_charges: `Input GST In-state - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`,
      taxes: [
        { charge_type: 'On Net Total', account_head: `Input Tax CGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: `Input Tax CGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}` },
        { charge_type: 'On Net Total', account_head: `Input Tax SGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}`, description: `Input Tax SGST - ${import.meta.env.VITE_COMPANY_ABBR || 'KGF'}` }
      ],
      update_stock: 1, // Crucial for our simplified workflow
      docstatus: 1 // Try to submit immediately
    };

    toast.promise(
      insertDoc({ doc }),
      {
        loading: 'Saving Purchase Invoice...',
        success: (res) => {
          navigate('/purchase');
          return `Purchase ${res.message.name} submitted successfully!`;
        },
        error: (err) => err.message || 'Error saving purchase'
      }
    );
  };

  const addItem = () => setItems([...items, { item_code: '', item_name: '', description: '', qty: '', rate: 0, carton: '', packing: '', carton_weight: '', discount: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleCreateItem = async () => {
    try {
      if (!newItemData.item_code || !newItemData.item_name) {
        toast.error('Item Code and Name are required');
        return;
      }
      setIsCreatingItem(true);

      const itemDoc = {
        doctype: 'Item',
        item_code: newItemData.item_code,
        item_name: newItemData.item_name,
        item_group: 'Products',
        gst_hsn_code: '999999',
        is_stock_item: 1,
      };

      await insertDoc({ doc: itemDoc });

      toast.success('Item created successfully');
      await mutateItemList();

      if (activeRowIndex !== null) {
        const newItems = [...items];
        newItems[activeRowIndex].item_code = newItemData.item_code;
        newItems[activeRowIndex].item_name = newItemData.item_name;
        newItems[activeRowIndex].description = '';
        setItems(newItems);
      }

      setCreateItemModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error creating item');
    } finally {
      setIsCreatingItem(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">New Purchase</Typography>
        <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave}>Save & Submit</Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Supplier"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
            >
              {suppliers?.map(s => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Supplier Invoice No (Bill No)"
              value={billNo}
              onChange={e => setBillNo(e.target.value)}
              required
            />
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
              <TableCell sx={{ width: 100 }}>Carton</TableCell>
              <TableCell sx={{ width: 100 }}>Packing</TableCell>
              <TableCell sx={{ width: 120 }}>Quantity</TableCell>
              <TableCell sx={{ width: 120 }}>C. Wt.</TableCell>
              <TableCell sx={{ width: 120 }}>Rate</TableCell>
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
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{idx + 1}</Typography>
                </TableCell>
                <TableCell>
                  <Autocomplete
                    options={[...(itemList || []), { is_create_btn: true, item_code: '+ Create New Item' }]}
                    getOptionLabel={(option) => option?.item_code || ''}
                    value={itemList?.find(i => i.item_code === item.item_code) || null}
                    renderOption={(props, option) => {
                      const { key, ...restProps } = props;
                      if (option.is_create_btn) {
                        return (
                          <li key={key} {...restProps} style={{ color: '#007bff', fontWeight: 'bold', justifyContent: 'center' }}>
                            {option.item_code}
                          </li>
                        );
                      }
                      return <li key={key} {...restProps}>{option.item_code} - {option.item_name}</li>;
                    }}
                    onChange={(e, newValue) => {
                      if (newValue?.is_create_btn) {
                        setNewItemData({ item_code: '', item_name: '' });
                        setActiveRowIndex(idx);
                        setCreateItemModalOpen(true);
                        return;
                      }

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
                        newItems[idx].gst_percentage = newValue.gst_percentage || 0;
                      } else {
                        newItems[idx].item_code = '';
                        newItems[idx].item_name = '';
                        newItems[idx].description = '';
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
                      setItems(newItems);
                    }
                  }} />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={item.qty}
                    disabled={!!item.carton || !!item.packing}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const newItems = [...items];
                        newItems[idx].qty = val;
                        setItems(newItems);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField size="small" value={item.carton_weight} disabled={!item.carton} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      const newItems = [...items];
                      newItems[idx].carton_weight = val;
                      setItems(newItems);
                    }
                  }} />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={item.rate}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const newItems = [...items];
                        newItems[idx].rate = val;
                        setItems(newItems);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>₹{(() => {
                  const grossAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                  return grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}</TableCell>
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
                <TableCell>₹{(() => {
                  const grossAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                  const discountAmt = grossAmount * ((Number(item.discount) || 0) / 100);
                  return discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}</TableCell>
                <TableCell>{item.gst_percentage || 0}%</TableCell>
                <TableCell>₹{(() => {
                  const grossAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                  const discountAmt = grossAmount * ((Number(item.discount) || 0) / 100);
                  const taxableAmount = grossAmount - discountAmt;
                  const gstAmt = taxableAmount * ((Number(item.gst_percentage) || 0) / 100);
                  return gstAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}</TableCell>
                <TableCell>₹{(() => {
                  const grossAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                  const discountAmt = grossAmount * ((Number(item.discount) || 0) / 100);
                  const taxableAmount = grossAmount - discountAmt;
                  const gstAmt = taxableAmount * ((Number(item.gst_percentage) || 0) / 100);
                  const netAmount = taxableAmount + gstAmt;
                  return netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}</TableCell>
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

      <Dialog open={createItemModalOpen} onClose={() => !isCreatingItem && setCreateItemModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Item Code" size="small" value={newItemData.item_code} onChange={e => setNewItemData({ ...newItemData, item_code: e.target.value })} disabled={isCreatingItem} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Item Name" size="small" value={newItemData.item_name} onChange={e => setNewItemData({ ...newItemData, item_name: e.target.value })} disabled={isCreatingItem} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateItemModalOpen(false)} disabled={isCreatingItem}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateItem} disabled={isCreatingItem}>
            {isCreatingItem ? 'Saving...' : 'Save Item'}
          </Button>
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
      supportedScanTypes: [0] // 0 = Camera only
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
