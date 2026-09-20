import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Paper, Grid, TextField, 
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Receipt, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';

export default function PaymentScreen() {
  const navigate = useNavigate();
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Payment Dialog State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  // API Calls
  const { data: balancesData, isLoading, mutate: mutateBalances } = useFrappeGetCall('goldretail.api.payments.payment_allocator.get_customer_balances');
  const { call: allocatePayment } = useFrappePostCall('goldretail.api.payments.payment_allocator.allocate_customer_payment');

  const handleOpenPay = (customerData) => {
    setSelectedCustomer(customerData);
    setPayAmount('');
    setPayModalOpen(true);
  };

  const handleClosePay = () => {
    setPayModalOpen(false);
    setSelectedCustomer(null);
    setPayAmount('');
  };

  const handleProcessPayment = () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > selectedCustomer.total_outstanding) {
      toast.error(`Amount cannot exceed the current outstanding balance of ₹${selectedCustomer.total_outstanding}`);
      return;
    }

    toast.promise(
      allocatePayment({ customer: selectedCustomer.customer, amount }),
      {
        loading: 'Allocating payment (FIFO)...',
        success: (res) => {
          mutateBalances();
          handleClosePay();
          return `Successfully allocated ₹${res.message.allocated}. Created ${res.message.payments.length} Payment Entries.`;
        },
        error: (err) => err.message || 'Error processing payment'
      }
    );
  };

  // Filtering
  const filteredCustomers = React.useMemo(() => {
    if (!balancesData?.message) return [];
    return balancesData.message.filter(c => {
      const matchSearch = c.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBalance = showZeroBalance ? true : c.total_outstanding > 0;
      return matchSearch && matchBalance;
    });
  }, [balancesData, showZeroBalance, searchTerm]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Payments & Outstanding</Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Customer"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showZeroBalance}
                  onChange={(e) => setShowZeroBalance(e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography fontWeight="600" color="text.secondary">Show 0 pending amount customers</Typography>}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader aria-label="payments table">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Customer</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Pending Amount (₹)</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Last Payment Date</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Last Payment (₹)</Typography></TableCell>
                <TableCell align="center"><Typography variant="subtitle2" fontWeight={600}>Actions</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && filteredCustomers.map((row) => (
                <TableRow hover key={row.customer}>
                  <TableCell><Typography variant="subtitle2" fontWeight={700}>{row.customer}</Typography></TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color={row.total_outstanding > 0 ? 'error.main' : 'success.main'} fontWeight={600}>
                      {row.total_outstanding.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" color="textSecondary">
                      {row.last_payment_date ? dayjs(row.last_payment_date).format('DD MMM YYYY') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="textSecondary">
                      {row.last_payment_amount ? row.last_payment_amount.toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small" 
                        startIcon={<Receipt size={16} />}
                        onClick={() => handleOpenPay(row)}
                        disabled={row.total_outstanding <= 0}
                      >
                        Payment
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary" 
                        size="small" 
                        startIcon={<Clock size={16} />}
                        onClick={() => navigate(`/payment/${encodeURIComponent(row.customer)}/history`)}
                      >
                        History
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCustomers.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="subtitle2" py={3}>No customers found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={payModalOpen} onClose={handleClosePay} maxWidth="xs" fullWidth>
        <DialogTitle>Receive Payment</DialogTitle>
        <DialogContent>
          <DialogContentText mb={3}>
            Enter an amount to automatically settle outstanding Sales Invoices for <strong>{selectedCustomer?.customer}</strong> in FIFO order.
          </DialogContentText>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary">Current Outstanding</Typography>
            <Typography variant="h5" fontWeight="bold" color="error.main">
              ₹{selectedCustomer?.total_outstanding?.toLocaleString()}
            </Typography>
          </Paper>

          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Amount to Receive (₹)"
            variant="outlined"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClosePay} color="inherit">Cancel</Button>
          <Button onClick={handleProcessPayment} variant="contained" color="primary">Process Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
