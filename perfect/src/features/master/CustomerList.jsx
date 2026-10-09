import React from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { IconPlus, IconEye } from '@tabler/icons-react';
import Spinner from '../../views/spinner/Spinner';

export default function CustomerList() {
  const navigate = useNavigate();

  const { data: customers, isLoading, error } = useFrappeGetDocList('Customer', {
    fields: ['name', 'customer_name', 'customer_group', 'customer_type', 'default_price_list'],
    limit: 100,
    orderBy: { field: 'creation', order: 'desc' }
  });

  if (isLoading) return <Spinner />;
  if (error) return <Typography color="error">Error loading customers</Typography>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Customer Master</Typography>
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/master/customer/new')}>
          New Customer
        </Button>
      </Box>

      <BlankCard>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell>Price List</TableCell>
                <TableCell>Customer Group</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers?.map((customer) => (
                <TableRow 
                  key={customer.name} 
                  hover 
                  onClick={() => navigate(`/master/customer/${encodeURIComponent(customer.name)}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="600">{customer.customer_name}</Typography>
                    <Typography variant="body2" color="textSecondary" fontSize="12px">{customer.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={customer.default_price_list || 'Standard'} color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{customer.customer_group}</TableCell>
                </TableRow>
              ))}
              {!customers?.length && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>No Customers Found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </BlankCard>
    </Box>
  );
}
