import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Chip,
  TablePagination,
  CircularProgress,
  Grid,
  Autocomplete,
  createFilterOptions,
} from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { IconPlus } from '@tabler/icons-react';

const customerFilterOptions = createFilterOptions({
  stringify: (option) => {
    if (typeof option === 'string') return option;
    return `${option.name || ''} ${option.customer_name || ''}`;
  },
});

export default function SalesList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Filter states
  const [customerFilter, setCustomerFilter] = useState(null);
  const [customerInput, setCustomerInput] = useState('');

  // Fetch sales invoices
  const { data, isLoading } = useFrappeGetDocList('Sales Invoice', {
    filters: { docstatus: ['!=', 2] },
    fields: [
      'name',
      'customer',
      'customer_name',
      'grand_total',
      'posting_date',
      'outstanding_amount',
      'status',
      'docstatus',
    ],
    orderBy: { field: 'name', order: 'desc' },
    limit: 10000,
  });

  // Fetch customers for the link field dropdown
  const { data: customers, isLoading: isCustomersLoading } = useFrappeGetDocList('Customer', {
    fields: ['name', 'customer_name'],
    orderBy: { field: 'customer_name', order: 'asc' },
    limit: 10000,
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };



  const handleBlur = () => {
    const trimmed = customerInput.trim();
    if (trimmed) {
      if (customerFilter && typeof customerFilter === 'object') {
        const optionName = (customerFilter.name || '').toLowerCase();
        const optionCustName = (customerFilter.customer_name || '').toLowerCase();
        const inputLower = trimmed.toLowerCase();
        // If the entered text differs from the selected option, treat as like filter
        if (inputLower !== optionName && inputLower !== optionCustName) {
          setCustomerFilter(trimmed);
        }
      } else if (customerFilter !== trimmed) {
        setCustomerFilter(trimmed);
      }
    } else if (customerFilter) {
      setCustomerFilter(null);
    }
  };

  const handleInputChange = (event, newInputValue, reason) => {
    setCustomerInput(newInputValue);
    if (reason === 'clear' || !newInputValue.trim()) {
      setCustomerFilter(null);
    }
  };

  const handleChange = (event, newValue) => {
    if (typeof newValue === 'string') {
      const trimmed = newValue.trim();
      setCustomerFilter(trimmed || null);
      setCustomerInput(newValue);
    } else if (newValue && typeof newValue === 'object') {
      setCustomerFilter(newValue);
      setCustomerInput(newValue.customer_name || newValue.name || '');
    } else {
      setCustomerFilter(null);
      setCustomerInput('');
    }
  };

  const handleResetFilters = () => {
    setCustomerFilter(null);
    setCustomerInput('');
  };

  const getOptionLabel = (option) => {
    if (typeof option === 'string') return option;
    if (!option) return '';
    return option.customer_name || option.name || '';
  };

  const isOptionEqualToValue = (option, value) => {
    if (!value) return false;
    if (typeof value === 'string') {
      const valLower = value.toLowerCase().trim();
      return (
        (option.name && option.name.toLowerCase() === valLower) ||
        (option.customer_name && option.customer_name.toLowerCase() === valLower)
      );
    }
    return option.name === value.name;
  };

  // Filter data based on selected customer or raw text (LIKE filter)
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!customerFilter) return data;

    // Selected from dropdown list
    if (typeof customerFilter === 'object') {
      const targetName = (customerFilter.name || '').toLowerCase().trim();
      const targetCustName = (customerFilter.customer_name || '').toLowerCase().trim();
      return data.filter((row) => {
        const rowCust = (row.customer || '').toLowerCase().trim();
        const rowCustName = (row.customer_name || '').toLowerCase().trim();
        return (
          (targetName && rowCust === targetName) ||
          (targetCustName && rowCustName === targetCustName) ||
          (targetCustName && rowCust === targetCustName) ||
          (targetName && rowCustName === targetName)
        );
      });
    }

    // Entered value without selecting from list -> "like" filter
    const search = customerFilter.toLowerCase().trim();
    if (!search) return data;

    return data.filter((row) => {
      const rowCust = (row.customer || '').toLowerCase();
      const rowCustName = (row.customer_name || '').toLowerCase();
      return rowCust.includes(search) || rowCustName.includes(search);
    });
  }, [data, customerFilter]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) =>
      (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Sales Invoices</Typography>
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/sales/new')}>
          New Sale
        </Button>
      </Box>

      {/* Filters Section */}
      <BlankCard>
        <Box sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2.5} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Autocomplete
                freeSolo
                clearOnBlur={false}
                fullWidth
                options={customers || []}
                loading={isCustomersLoading}
                filterOptions={customerFilterOptions}
                getOptionLabel={getOptionLabel}
                isOptionEqualToValue={isOptionEqualToValue}
                value={customerFilter}
                inputValue={customerInput}
                onInputChange={handleInputChange}
                onChange={handleChange}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  const isDiff = option.customer_name && option.name && option.customer_name !== option.name;
                  return (
                    <li
                      key={key || option.name}
                      {...restProps}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '8px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                        {option.customer_name || option.name}
                      </Typography>
                      {isDiff && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                          {option.name}
                        </Typography>
                      )}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    label="Customer"
                    placeholder="Search or enter customer..."
                    onBlur={(e) => {
                      params.inputProps?.onBlur?.(e);
                      handleBlur();
                    }}
                    onKeyDown={(e) => {
                      params.inputProps?.onKeyDown?.(e);
                      if (e.key === 'Enter') {
                        handleBlur();
                      }
                    }}
                  />
                )}
              />
            </Grid>
            {(customerFilter || customerInput) && (
              <Grid item xs={12} sm={6} md={2}>
                <Button variant="outlined" color="inherit" onClick={handleResetFilters}>
                  Reset Filter
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </BlankCard>

      <BlankCard>
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
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
                  <TableRow
                    hover
                    key={row.name}
                    onClick={() => navigate(`/sales/${encodeURIComponent(row.name)}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell><Typography variant="subtitle2" color="textSecondary">{row.name}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" color="textSecondary">
                        {row.customer_name || row.customer}
                      </Typography>
                      {row.customer_name && row.customer && row.customer_name !== row.customer && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          {row.customer}
                        </Typography>
                      )}
                    </TableCell>
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
                {sortedData.length === 0 && !isLoading && (
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
            count={sortedData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </BlankCard>
    </Box>
  );
}
