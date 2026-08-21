import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { ShoppingCart, Store, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: recentSales } = useFrappeGetDocList('Sales Invoice', {
    fields: ['name', 'customer', 'grand_total', 'posting_date'],
    orderBy: { field: 'creation', order: 'desc' },
    limit: 5,
  });

  const { data: recentPurchases } = useFrappeGetDocList('Purchase Invoice', {
    fields: ['name', 'supplier', 'grand_total', 'posting_date'],
    orderBy: { field: 'creation', order: 'desc' },
    limit: 5,
  });

  const { data: pendingReceivables } = useFrappeGetDocList('Sales Invoice', {
    fields: ['name', 'outstanding_amount'],
    filters: [['outstanding_amount', '>', 0]],
    limit: 100,
  });

  const { data: pendingPayables } = useFrappeGetDocList('Purchase Invoice', {
    fields: ['name', 'outstanding_amount'],
    filters: [['outstanding_amount', '>', 0]],
    limit: 100,
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">Dashboard</Typography>
        <Button variant="contained" onClick={() => navigate('/reports/stock-balance')}>
          Stock Balance Report
        </Button>
      </Box>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={0}>
            <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" fontWeight="600" gutterBottom>Recent Sales Count</Typography>
                <Typography variant="h3" fontWeight="bold">{recentSales?.length || 0}</Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(24, 144, 255, 0.16)' : 'rgba(24, 144, 255, 0.08)', color: '#1890FF' }}>
                <Store size={32} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0}>
            <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" fontWeight="600" gutterBottom>Pending Receivables</Typography>
                <Typography variant="h3" fontWeight="bold">View GL</Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255, 193, 7, 0.16)' : 'rgba(255, 193, 7, 0.08)', color: '#FFC107' }}>
                <CreditCard size={32} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0}>
            <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" fontWeight="600" gutterBottom>Recent Purchases</Typography>
                <Typography variant="h3" fontWeight="bold">{recentPurchases?.length || 0}</Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(0, 171, 85, 0.16)' : 'rgba(0, 171, 85, 0.08)', color: '#00AB55' }}>
                <ShoppingCart size={32} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight="bold" mb={2}>Recent Sales</Typography>
          <TableContainer component={Card} elevation={0}>
            <Table size="medium">
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSales?.map((row) => (
                  <TableRow key={row.name} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{dayjs(row.posting_date).format('DD MMM YYYY')}</TableCell>
                    <TableCell align="right">₹{row.grand_total}</TableCell>
                  </TableRow>
                ))}
                {!recentSales?.length && <TableRow><TableCell colSpan={4} align="center">No recent sales</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight="bold" mb={2}>Recent Purchases</Typography>
          <TableContainer component={Card} elevation={0}>
            <Table size="medium">
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Supplier</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPurchases?.map((row) => (
                  <TableRow key={row.name} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.supplier}</TableCell>
                    <TableCell>{dayjs(row.posting_date).format('DD MMM YYYY')}</TableCell>
                    <TableCell align="right">₹{row.grand_total}</TableCell>
                  </TableRow>
                ))}
                {!recentPurchases?.length && <TableRow><TableCell colSpan={4} align="center">No recent purchases</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
