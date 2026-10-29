import React, { useEffect } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import { Outlet, useLocation } from 'react-router';

import Header from './vertical/header/Header';
import HorizontalHeader from '../full/horizontal/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import Customizer from './shared/customizer/Customizer';
import Navigation from './horizontal/navbar/Navbar';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from '../../LoadingBar';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  paddingBottom: '60px',
  flexDirection: 'column',
  zIndex: 1,
  width: '100%',
  backgroundColor: 'transparent',
  minWidth: 0,
}));

const routeTitles = {
  '/': 'Dashboard',
  '/sales': 'Sales Invoices',
  '/sales/new': 'New Sale',
  '/purchase': 'Purchase Invoices',
  '/purchase/new': 'New Purchase',
  '/payment': 'Payments & Outstanding',
  '/reports/stock-balance': 'Stock Balance',
  '/reports/customer-outstanding': 'Customer Outstanding',
  '/settings': 'Settings',
  '/master/item': 'Item Master',
  '/master/item/new': 'New Item',
  '/master/catalog': 'Item Catalog',
  '/master/customer': 'Customer Master',
  '/master/customer/new': 'New Customer',
  '/master/supplier': 'Supplier Master',
  '/master/supplier/new': 'New Supplier',
};

function getPageTitle(pathname) {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith('/sales/') && pathname.endsWith('/edit')) return 'Edit Sale';
  if (pathname.startsWith('/sales/')) return 'Sales Invoice';
  if (pathname.startsWith('/purchase/')) return 'Purchase Invoice';
  if (pathname.startsWith('/payment/')) return 'Payment History';
  if (pathname.startsWith('/master/item/') && pathname.endsWith('/edit')) return 'Edit Item';
  if (pathname.startsWith('/master/item/')) return 'Item Details';
  if (pathname.startsWith('/master/customer/')) return 'Customer Details';
  if (pathname.startsWith('/master/supplier/')) return 'Supplier Details';
  return '';
}

const FullLayout = () => {
  const customizer = useSelector((state) => state.customizer);
  const theme = useTheme();
  const location = useLocation();

  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname);
    document.title = pageTitle ? `${pageTitle} - Prime` : 'Prime';
  }, [location.pathname]);

  return (
    <>
      <LoadingBar />
      <MainWrapper
        className={customizer.activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar */}
        {/* ------------------------------------------- */}
        {customizer.isHorizontal ? '' : <Sidebar />}
        {/* ------------------------------------------- */}
        {/* Main Wrapper */}
        {/* ------------------------------------------- */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(customizer.isCollapse && {
              [theme.breakpoints.up('lg')]: { ml: `${customizer.MiniSidebarWidth}px` },
            }),
          }}
        >
          {/* ------------------------------------------- */}
          {/* Header */}
          {/* ------------------------------------------- */}
          {customizer.isHorizontal ? <HorizontalHeader /> : <Header />}
          {/* ------------------------------------------- */}
          {/* PageContent */}
          {/* ------------------------------------------- */}
          {customizer.isHorizontal ? <Navigation /> : ''}
          <Container
            sx={{
              maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
            }}
          >
            {/* ------------------------------------------- */}
            {/* Page Route */}
            {/* ------------------------------------------- */}
            <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
              <ScrollToTop>


                <Outlet />
              </ScrollToTop>
            </Box>
            {/* ------------------------------------------- */}
            {/* End Page */}
            {/* ------------------------------------------- */}
          </Container>
          <Customizer />
        </PageWrapper>
      </MainWrapper>
    </>

  );
};

export default FullLayout;
