import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Link,
  CircularProgress
} from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import { useFrappeGetCall } from 'frappe-react-sdk';
import { IconArrowLeft, IconDownload, IconReceipt, IconWallet, IconScale } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router';
import toast from 'react-hot-toast';

export default function PaymentHistory() {
  const { customer } = useParams();
  const navigate = useNavigate();
  const decodedCustomer = decodeURIComponent(customer || '');
  const [exporting, setExporting] = useState(false);

  const { data: ledgerData, isLoading } = useFrappeGetCall(
    'goldretail.api.payments.payment_allocator.get_customer_ledger',
    { customer: decodedCustomer }
  );

  // Calculate progressive balance chronologically (ASC), then order DESC (latest on top)
  const rows = useMemo(() => {
    if (!ledgerData?.message) return [];
    let runningBalance = 0;
    const calculatedRows = ledgerData.message.map((row) => {
      const invoiceAmount = Number(row.invoice_amount) || 0;
      const paymentAmount = Number(row.payment_amount) || 0;
      runningBalance += (invoiceAmount - paymentAmount);

      return {
        ...row,
        invoice_amount: invoiceAmount,
        payment_amount: paymentAmount,
        runningBalance
      };
    });
    // Latest transactions on top
    return calculatedRows.reverse();
  }, [ledgerData]);

  // Total summary calculations
  const totals = useMemo(() => {
    let totalInvoice = 0;
    let totalPayment = 0;
    for (const row of rows) {
      totalInvoice += (Number(row.invoice_amount) || 0);
      totalPayment += (Number(row.payment_amount) || 0);
    }
    const balance = totalInvoice - totalPayment;
    return {
      totalInvoice,
      totalPayment,
      balance
    };
  }, [rows]);

  const handleExportExcel = async () => {
    if (!decodedCustomer) return;
    setExporting(true);
    const toastId = toast.loading('Exporting to Excel...');
    try {
      const params = new URLSearchParams({ customer: decodedCustomer });
      const url = `/api/method/goldretail.api.payments.payment_allocator.export_customer_ledger?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Export failed (${response.statusText})`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateStr = dayjs().format('DDMMMYYYY').toLowerCase();
      const safeCustomer = decodedCustomer.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeCustomer}_transaction_history_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Excel exported successfully!', { id: toastId });
    } catch (err) {
      toast.error('Failed to export: ' + (err.message || 'Unknown error'), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      {/* Header with Back button and Export option */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="text"
            color="inherit"
            onClick={() => navigate('/payment')}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <IconArrowLeft />
          </Button>
          <Box>
            <Typography variant="h5" fontWeight="bold">Transaction History</Typography>
            <Typography variant="subtitle2" color="text.secondary">{decodedCustomer}</Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <IconDownload size={18} />}
          onClick={handleExportExcel}
          disabled={isLoading || rows.length === 0 || exporting}
          sx={{ fontWeight: 600 }}
        >
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </Box>

      {/* Total Section above the table */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={4}>
          <BlankCard>
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={500} gutterBottom>
                  Total Invoice Amount
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  ₹{totals.totalInvoice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'error.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'error.main'
                }}
              >
                <IconReceipt size={24} />
              </Box>
            </Box>
          </BlankCard>
        </Grid>

        <Grid item xs={12} sm={4}>
          <BlankCard>
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={500} gutterBottom>
                  Total Payment Amount
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  ₹{totals.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'success.main'
                }}
              >
                <IconWallet size={24} />
              </Box>
            </Box>
          </BlankCard>
        </Grid>

        <Grid item xs={12} sm={4}>
          <BlankCard>
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={500} gutterBottom>
                  Total Balance
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color={totals.balance > 0 ? 'error.main' : totals.balance < 0 ? 'success.main' : 'text.primary'}
                >
                  ₹{totals.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: totals.balance > 0 ? 'error.light' : 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: totals.balance > 0 ? 'error.main' : 'primary.main'
                }}
              >
                <IconScale size={24} />
              </Box>
            </Box>
          </BlankCard>
        </Grid>
      </Grid>

      {/* Transaction Table */}
      <BlankCard>
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
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
                    <TableCell>
                      {(row.voucher_type === 'Sales Invoice' || (row.invoice_amount > 0 && !row.payment_amount)) ? (
                        <Link
                          href={`/prime/sales/${encodeURIComponent(row.reference)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            textUnderlineOffset: '3px',
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.dark',
                              textDecorationStyle: 'solid'
                            }
                          }}
                        >
                          {row.reference}
                        </Link>
                      ) : (
                        <Typography variant="subtitle2" fontWeight={600}>
                          {row.reference}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="error.main" fontWeight={row.invoice_amount > 0 ? 600 : 400}>
                        {row.invoice_amount > 0 ? row.invoice_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="success.main" fontWeight={row.payment_amount > 0 ? 600 : 400}>
                        {row.payment_amount > 0 ? row.payment_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="textPrimary" fontWeight={700}>
                        {row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total row at the last of the list */}
                {!isLoading && rows.length > 0 && (
                  <TableRow
                    sx={{
                      bgcolor: 'action.hover',
                      borderTop: '2px solid',
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                      '& td': { py: 1.5 }
                    }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                        Total
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="error.main" fontWeight={800}>
                        {totals.totalInvoice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="success.main" fontWeight={800}>
                        {totals.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="subtitle2"
                        color={totals.balance > 0 ? 'error.main' : 'text.primary'}
                        fontWeight={800}
                      >
                        {totals.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

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
        </Box>
      </BlankCard>
    </Box>
  );
}

