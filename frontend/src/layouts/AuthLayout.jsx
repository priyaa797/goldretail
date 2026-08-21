import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function AuthLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Outlet />
      <Toaster position="top-right" />
    </Box>
  );
}
