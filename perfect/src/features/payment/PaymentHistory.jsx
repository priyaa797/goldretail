import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Paper, 
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer
} from '@mui/material';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router';

export default function PaymentHistory() {
  const { customer } = useParams();
  const navigate = useNavigate();
  const decodedCustomer = decodeURIComponent(customer || '');

  const { data: ledgerData, isLoading } = useFrappeGetCall('goldretail.api.payments.payment_allocator.get_customer_ledger', {
    customer: decodedCustomer
  });

  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (ledgerData && ledgerData.message) {
      let runningBalance = 0;
      const calculatedRows = ledgerData.message.map((row) => {
        const invoiceAmount = row.invoice_amount || 0;
        const paymentAmount = row.payment_amount || 0;
        runningBalance += (invoiceAmount - paymentAmount);
        
        return {
          ...row,
          runningBalance
        };
      });
      setRows(calculatedRows);
    } else {
      setRows([]);
    }
  }, [ledgerData]);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button 
          variant="text" 
          color="inherit" 
          onClick={() => navigate('/payment')}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <ArrowLeft />
        </Button>
        <Box>
          <Typography variant="h5" fontWeight="bold">Transaction History</Typography>
          <Typography variant="subtitle2" color="text.secondary">{decodedCustomer}</Typography>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader aria-label="payment history table">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Date</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Reference</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Invoice Amount (₹)</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Payment Amount (₹)</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Running Balance (₹)</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && rows.map((row, index) => (
                <TableRow hover key={index}>
                  <TableCell>
                    <Typography variant="subtitle2" color="textSecondary">
                      {row.date ? dayjs(row.date).format('DD MMM YYYY') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>{row.reference}</Typography></TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="error.main" fontWeight={row.invoice_amount > 0 ? 600 : 400}>
                      {row.invoice_amount > 0 ? row.invoice_amount.toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="success.main" fontWeight={row.payment_amount > 0 ? 600 : 400}>
                      {row.payment_amount > 0 ? row.payment_amount.toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="textPrimary" fontWeight={700}>
                      {row.runningBalance.toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="subtitle2" py={3}>No transactions found for this customer</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
