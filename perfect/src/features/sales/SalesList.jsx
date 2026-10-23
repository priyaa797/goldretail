import React, { useState, useMemo } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip, TablePagination, CircularProgress } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { IconPlus } from '@tabler/icons-react';

export default function SalesList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const { data, isLoading } = useFrappeGetDocList('Sales Invoice', {
    filters: { "docstatus": ["!=", 2] },
    fields: ['name', 'customer', 'grand_total', 'posting_date', 'outstanding_amount', 'status', 'docstatus'],
    orderBy: { field: 'creation', order: 'desc' },
    limit: 10000
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedData = useMemo(() => {
    if (!data) return [];
    return data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [data, page, rowsPerPage]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight="bold">Sales Invoices</Typography>
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/sales/new')}>New Sale</Button>
      </Box>
      <BlankCard><Box sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader aria-label="sales table">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>ID</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Customer</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Date</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Total (₹)</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight={600}>Pending (₹)</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight={600}>Status</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && paginatedData.map((row) => (
                <TableRow hover key={row.name} onClick={() => navigate(`/sales/${encodeURIComponent(row.name)}`)} sx={{ cursor: 'pointer' }}>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.name}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{row.customer}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" color="textSecondary">{dayjs(row.posting_date).format('DD MMM YYYY')}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.grand_total}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2" color="textSecondary">{row.outstanding_amount}</Typography></TableCell>
                  <TableCell>
                    <Chip
                      label={row.docstatus === 0 ? 'Draft' : row.status}
                      size="small"
                      color={row.docstatus === 0 ? 'warning' : row.status === 'Paid' ? 'success' : row.status === 'Unpaid' ? 'error' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center"><Typography variant="subtitle2" py={3}>No sales found</Typography></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={data?.length || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box></BlankCard>
    </Box>
  );
}
