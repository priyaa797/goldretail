import React from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { IconPlus, IconEye } from '@tabler/icons-react';
import Spinner from '../../views/spinner/Spinner';

export default function SupplierList() {
  const navigate = useNavigate();

  const { data: suppliers, isLoading, error } = useFrappeGetDocList('Supplier', {
    fields: ['name', 'supplier_name', 'supplier_group', 'supplier_type'],
    limit: 100,
    orderBy: { field: 'creation', order: 'desc' }
  });

  if (isLoading) return <Spinner />;
  if (error) return <Typography color="error">Error loading suppliers</Typography>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Supplier Master</Typography>
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/master/supplier/new')}>
          New Supplier
        </Button>
      </Box>

      <BlankCard>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Supplier Name</TableCell>
                <TableCell>Supplier Group</TableCell>
                <TableCell>Supplier Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers?.map((supplier) => (
                <TableRow 
                  key={supplier.name} 
                  hover 
                  onClick={() => navigate(`/master/supplier/${encodeURIComponent(supplier.name)}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="600">{supplier.supplier_name}</Typography>
                    <Typography variant="body2" color="textSecondary" fontSize="12px">{supplier.name}</Typography>
                  </TableCell>
                  <TableCell>{supplier.supplier_group}</TableCell>
                  <TableCell>{supplier.supplier_type}</TableCell>
                </TableRow>
              ))}
              {!suppliers?.length && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>No Suppliers Found</Typography>
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
