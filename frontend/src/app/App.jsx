import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { Box, CircularProgress } from '@mui/material';

// We will create these shortly
import AppLayout from '../components/layout/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../features/auth/Login';
import Dashboard from '../features/dashboard/Dashboard';
import PurchaseList from '../features/purchase/PurchaseList';
import PurchaseForm from '../features/purchase/PurchaseForm';
import SalesList from '../features/sales/SalesList';
import SalesForm from '../features/sales/SalesForm';
import PaymentScreen from '../features/payment/PaymentScreen';
import StockBalance from '../features/reports/stock-balance/StockBalance';
import Settings from '../features/settings/Settings';

import SalesDetails from '../features/sales/SalesDetails';
import PurchaseDetails from '../features/purchase/PurchaseDetails';

import CustomerOutstanding from '../features/reports/customer-outstanding/CustomerOutstanding';

const ProtectedRoute = () => {
  const { currentUser, isLoading } = useFrappeAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/purchase" element={<PurchaseList />} />
          <Route path="/purchase/new" element={<PurchaseForm />} />
          <Route path="/purchase/:id" element={<PurchaseDetails />} />
          <Route path="/sales" element={<SalesList />} />
          <Route path="/sales/new" element={<SalesForm />} />
          <Route path="/sales/:id" element={<SalesDetails />} />
          <Route path="/payment" element={<PaymentScreen />} />
          <Route path="/reports/stock-balance" element={<StockBalance />} />
          <Route path="/reports/customer-outstanding" element={<CustomerOutstanding />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}
