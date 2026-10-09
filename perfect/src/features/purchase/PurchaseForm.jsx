import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid, MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, createFilterOptions } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useFrappePostCall, useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { IconTrash, IconDeviceFloppy, IconCamera } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

const filterOptions = createFilterOptions({
  stringify: (option) => option.is_create_btn ? option.item_code : `${option.item_code} ${option.item_name || ''}`,
});

export default function PurchaseForm() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [items, setItems] = useState([{ item_code: '', item_name: '', description: '', qty: '', rate: 0, carton: '', packing: '', total_weight: '', discount: '' }]);

  const { data: suppliers } = useFrappeGetDocList('Supplier', { fields: ['name'] });
  const { data: itemListResponse, mutate: mutateItemList } = useFrappeGetCall('goldretail.api.item_barcode.get_all_items');
  const itemList = itemListResponse?.message || [];

  const { call: insertDoc } = useFrappePostCall('frappe.client.insert');
  const { call: getBarcodeItem } = useFrappePostCall('goldretail.api.item_barcode.get_item_by_barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [newItemData, setNewItemData] = useState({ item_code: '', item_name: '', weight_per_unit: '', nos_per_carton: '' });
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
          total_weight: Number(i.total_weight) || 0
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

  const addItem = () => setItems([...items, { item_code: '', item_name: '', description: '', qty: '', rate: 0, carton: '', packing: '', total_weight: '', discount: '', weight_per_unit: 0 }]);
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
        stock_uom: 'Nos',
        weight_per_unit: parseFloat(newItemData.weight_per_unit) || 0,
        weight_uom: 'Nos'
      };

      if (newItemData.nos_per_carton) {
        itemDoc.uoms = [
          { uom: 'Nos', conversion_factor: 1 },
          { uom: 'Carton', conversion_factor: parseFloat(newItemData.nos_per_carton) }
        ];
      } else {
        itemDoc.uoms = [
          { uom: 'Nos', conversion_factor: 1 }
        ];
      }

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
        <Button variant="contained" startIcon={<IconDeviceFloppy size={18} />} onClick={handleSave}>Save & Submit</Button>
      </Box>

      <BlankCard><Box sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={suppliers || []}
              getOptionLabel={(option) => option.name || ''}
              value={suppliers?.find(s => s.name === supplier) || null}
              onChange={(e, newValue) => setSupplier(newValue ? newValue.name : '')}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  fullWidth
                  label="Supplier"
                  placeholder="Select Supplier..."
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label="Supplier Invoice No (Bill No)"
              value={billNo}
              onChange={e => setBillNo(e.target.value)}
              required
            />
          </Grid>
        </Grid>
      </Box></BlankCard>

      <BlankCard><Box sx={{ p: 3 }}>
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 50 }}>S.No.</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Item Code</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Item Name</TableCell>
              <TableCell sx={{ width: 250, minWidth: 250 }}>Description</TableCell>
              <TableCell sx={{ width: 100 }}>Carton</TableCell>
              <TableCell sx={{ width: 100 }}>Packing</TableCell>
              <TableCell sx={{ width: 120 }}>Quantity</TableCell>
              <TableCell sx={{ width: 120 }}>Total Wt.</TableCell>
              <TableCell sx={{ width: 120 }}>Rate</TableCell>
              <TableCell sx={{ width: 120 }}>Net Amt</TableCell>
              <TableCell sx={{ width: 40, p: 0 }}></TableCell>
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
                    filterOptions={filterOptions}
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
                      return (
                        <li key={key} {...restProps} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 16px' }}>
                          <Typography variant="body1" sx={{ lineHeight: 1.2 }}>{option.item_code}</Typography>
                          <Typography variant="caption" color="textSecondary">{option.item_name}</Typography>
                        </li>
                      );
                    }}
                    onChange={(e, newValue) => {
                      if (newValue?.is_create_btn) {
                        setNewItemData({ item_code: '', item_name: '', weight_per_unit: '', nos_per_carton: '' });
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
                        newItems[idx].packing = newValue.packing_from_item || '';
                        newItems[idx].weight_per_unit = newValue.weight_per_unit || 0;
                        newItems[idx].carton = '';
                        newItems[idx].qty = '';
                        newItems[idx].total_weight = '';
                      } else {
                        newItems[idx].item_code = '';
                        newItems[idx].item_name = '';
                        newItems[idx].description = '';
                        newItems[idx].gst_percentage = 0;
                        newItems[idx].packing = '';
                        newItems[idx].weight_per_unit = 0;
                        newItems[idx].carton = '';
                        newItems[idx].qty = '';
                        newItems[idx].total_weight = '';
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
                  <CustomTextField
                    size="small"
                    value={item.qty}
                    disabled={!!item.carton}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const newItems = [...items];
                        newItems[idx].qty = val;
                        newItems[idx].total_weight = (Number(val) || 0) * (Number(newItems[idx].weight_per_unit) || 0);
                        setItems(newItems);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{item.total_weight || ((Number(item.qty) || 0) * (Number(item.weight_per_unit) || 0)).toFixed(2)}</Typography>
                </TableCell>
                <TableCell>
                  <CustomTextField
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
                  const netAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                  return netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}</TableCell>
                <TableCell sx={{ p: 0, textAlign: 'center' }}>
                  <IconButton color="error" onClick={() => removeItem(idx)}><IconTrash size={18} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button sx={{ mt: 2 }} onClick={addItem}>+ Add Row</Button>
      </Box></BlankCard>

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
              <CustomTextField fullWidth label="Item Code" size="small" value={newItemData.item_code} onChange={e => setNewItemData({ ...newItemData, item_code: e.target.value })} disabled={isCreatingItem} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField fullWidth label="Item Name" size="small" value={newItemData.item_name} onChange={e => setNewItemData({ ...newItemData, item_name: e.target.value })} disabled={isCreatingItem} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField fullWidth label="Per Piece Weight" size="small" type="number" value={newItemData.weight_per_unit} onChange={e => setNewItemData({ ...newItemData, weight_per_unit: e.target.value })} disabled={isCreatingItem} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField fullWidth label="Nos per Carton" size="small" type="number" value={newItemData.nos_per_carton} onChange={e => setNewItemData({ ...newItemData, nos_per_carton: e.target.value })} disabled={isCreatingItem} />
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
