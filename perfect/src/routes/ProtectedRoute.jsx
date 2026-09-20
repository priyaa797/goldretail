import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useFrappeAuth } from 'frappe-react-sdk';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = () => {
  const { currentUser, isLoading } = useFrappeAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return currentUser ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default ProtectedRoute;
