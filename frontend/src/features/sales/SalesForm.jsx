import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import { Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesForm() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([{ item_code: '', qty: 1, rate: 0 }]);
  
  const { data: customers } = useFrappeGetDocList('Customer', { fields: ['name'] });
  const { data: itemList } = useFrappeGetDocList('Item', { fields: ['name', 'item_code', 'item_name', 'standard_rate'] });

  const { call } = useFrappePostCall('frappe.client.insert');

  const handleSave = () => {
    const doc = {
      doctype: 'Sales Invoice',
      customer,
      items: items.map(i => ({ item_code: i.item_code, qty: i.qty, rate: i.rate })),
      update_stock: 1,
      docstatus: 1 
    };

    toast.promise(
      call({ doc }),
      {
        loading: 'Saving Sales Invoice...',
        success: (res) => {
          navigate('/sales');
          return `Sale ${res.message.name} submitted successfully!`;
        },
        error: (err) => err.message || 'Error saving sale'
      }
    );
  };

  const addItem = () => setItems([...items, { item_code: '', qty: 1, rate: 0 }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

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
              {customers?.map(c => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
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
                      const selectedItem = itemList?.find(i => i.item_code === e.target.value);
                      const newItems = [...items];
                      newItems[idx].item_code = e.target.value;
                      if (selectedItem?.standard_rate) {
                        newItems[idx].rate = selectedItem.standard_rate;
                      }
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
