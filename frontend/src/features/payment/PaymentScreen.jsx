import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem } from '@mui/material';
import { useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk';
import { Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentScreen() {
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState('');
  
  const { data: customers } = useFrappeGetDocList('Customer', { fields: ['name'] });
  const { call } = useFrappePostCall('goldretail.api.payments.payment_allocator.allocate_customer_payment');

  const handleProcessPayment = () => {
    if (!customer || !amount || amount <= 0) {
      toast.error('Please enter a valid customer and amount');
      return;
    }

    toast.promise(
      call({ customer, amount }),
      {
        loading: 'Allocating payment (FIFO)...',
        success: (res) => {
          setAmount('');
          return `Successfully allocated ₹${res.message.allocated}. Created ${res.message.payments.length} Payment Entries.`;
        },
        error: (err) => err.message || 'Error processing payment'
      }
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Receive Payment</Typography>
      </Box>

      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Typography variant="body1" color="text.secondary" mb={3}>
          Enter an amount to automatically settle outstanding Sales Invoices for the customer in FIFO order.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField 
              select 
              fullWidth 
              label="Select Customer" 
              value={customer} 
              onChange={e => setCustomer(e.target.value)}
            >
              {customers?.map(c => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField 
              type="number"
              fullWidth 
              label="Amount to Receive (₹)" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              size="large" 
              startIcon={<Receipt />} 
              onClick={handleProcessPayment}
              fullWidth
            >
              Process Auto-Allocation
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
