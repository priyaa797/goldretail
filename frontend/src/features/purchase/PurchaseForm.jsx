import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import { Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchaseForm() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState([{ item_code: '', qty: 1, rate: 0 }]);
  
  const { data: suppliers } = useFrappeGetDocList('Supplier', { fields: ['name'] });
  const { data: itemList } = useFrappeGetDocList('Item', { fields: ['name', 'item_code', 'item_name'] });

  const { call } = useFrappePostCall('frappe.client.insert');

  const handleSave = () => {
    const doc = {
      doctype: 'Purchase Invoice',
      supplier,
      items: items.map(i => ({ item_code: i.item_code, qty: i.qty, rate: i.rate })),
      update_stock: 1, // Crucial for our simplified workflow
      docstatus: 1 // Try to submit immediately
    };

    toast.promise(
      call({ doc }),
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

  const addItem = () => setItems([...items, { item_code: '', qty: 1, rate: 0 }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

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
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>Items</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item Code</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Rate</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <TextField 
                    select fullWidth
                    value={item.item_code}
                    onChange={e => {
                      const newItems = [...items];
                      newItems[idx].item_code = e.target.value;
                      setItems(newItems);
                    }}
                  >
                    {itemList?.map(i => <MenuItem key={i.item_code} value={i.item_code}>{i.item_code}</MenuItem>)}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField 
                    type="number"
                    value={item.qty}
                    onChange={e => {
                      const newItems = [...items];
                      newItems[idx].qty = Number(e.target.value);
                      setItems(newItems);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField 
                    type="number"
                    value={item.rate}
                    onChange={e => {
                      const newItems = [...items];
                      newItems[idx].rate = Number(e.target.value);
                      setItems(newItems);
                    }}
                  />
                </TableCell>
                <TableCell>₹{item.qty * item.rate}</TableCell>
                <TableCell>
                  <IconButton color="error" onClick={() => removeItem(idx)}><Trash2 size={18} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button sx={{ mt: 2 }} onClick={addItem}>+ Add Row</Button>
      </Paper>
    </Box>
  );
}
