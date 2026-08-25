import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, MenuItem } from '@mui/material';
import { useFrappeGetDocList, useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentScreen() {
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState('');
  
  const { data: customers } = useFrappeGetDocList('Customer', { fields: ['name'] });
  const { call } = useFrappePostCall('goldretail.api.payments.payment_allocator.allocate_customer_payment');
  const { data: outstandingData } = useFrappeGetCall('goldretail.api.payments.payment_allocator.get_customer_outstanding');

  const currentOutstanding = React.useMemo(() => {
    if (!customer || !outstandingData?.message) return 0;
    const row = outstandingData.message.find(r => r.customer === customer);
    return row ? row.total_outstanding : 0;
  }, [customer, outstandingData]);

  const handleProcessPayment = () => {
    const paymentAmount = parseFloat(amount);
    if (!customer || !paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid customer and amount');
      return;
    }

    if (paymentAmount > currentOutstanding) {
      toast.error(`Amount cannot exceed the current outstanding balance of ₹${currentOutstanding}`);
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
          <Grid item xs={12} md={customer ? 8 : 12}>
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
          {customer && (
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary">Current Outstanding</Typography>
                <Typography variant="h6" fontWeight="bold" color={currentOutstanding > 0 ? 'error.main' : 'success.main'}>
                  ₹{currentOutstanding}
                </Typography>
              </Paper>
            </Grid>
          )}
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
