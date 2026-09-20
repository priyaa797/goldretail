import React from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';

// UI Kit Components
import TopCards from './components/TopCards';
import TopPerformers from './components/TopPerformers';
import RevenueUpdates from './components/RevenueUpdates';

import iconSales from 'src/assets/images/svgs/icon-dd-cart.svg';
import iconPurchases from 'src/assets/images/svgs/icon-dd-invoice.svg';
import iconReceivables from 'src/assets/images/svgs/icon-account.svg';
import iconPayables from 'src/assets/images/svgs/icon-master-card.svg';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Data Fetching
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

  // Calculate totals
  const totalReceivables = pendingReceivables?.reduce((sum, doc) => sum + doc.outstanding_amount, 0) || 0;
  const totalPayables = pendingPayables?.reduce((sum, doc) => sum + doc.outstanding_amount, 0) || 0;

  const topCardsData = [
    {
      icon: iconSales,
      title: 'Recent Sales',
      digits: recentSales?.length || 0,
      bgcolor: 'primary',
    },
    {
      icon: iconPurchases,
      title: 'Recent Purchases',
      digits: recentPurchases?.length || 0,
      bgcolor: 'secondary',
    },
    {
      icon: iconReceivables,
      title: 'Pending Receivables',
      digits: `₹${totalReceivables.toLocaleString()}`,
      bgcolor: 'warning',
    },
    {
      icon: iconPayables,
      title: 'Pending Payables',
      digits: `₹${totalPayables.toLocaleString()}`,
      bgcolor: 'error',
    },
  ];

  const salesColumns = [
    { id: 'name', label: 'Invoice ID' },
    { id: 'customer', label: 'Customer' },
    { id: 'posting_date', label: 'Date', render: (row) => dayjs(row.posting_date).format('DD MMM YYYY') },
    { id: 'grand_total', label: 'Total', align: 'right', render: (row) => `₹${row.grand_total.toLocaleString()}` },
  ];

  const purchaseColumns = [
    { id: 'name', label: 'Invoice ID' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'posting_date', label: 'Date', render: (row) => dayjs(row.posting_date).format('DD MMM YYYY') },
    { id: 'grand_total', label: 'Total', align: 'right', render: (row) => `₹${row.grand_total.toLocaleString()}` },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">Dashboard</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Top Metric Cards */}
        <Grid size={12}>
          <TopCards cards={topCardsData} />
        </Grid>

        {/* Revenue Updates Chart */}
        <Grid size={{ xs: 12, lg: 12 }}>
          <RevenueUpdates />
        </Grid>

        {/* Recent Sales Table */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <TopPerformers 
            title="Recent Sales" 
            subtitle="Latest 5 transactions"
            columns={salesColumns}
            rows={recentSales || []}
          />
        </Grid>

        {/* Recent Purchases Table */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <TopPerformers 
            title="Recent Purchases" 
            subtitle="Latest 5 transactions"
            columns={purchaseColumns}
            rows={recentPurchases || []}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
