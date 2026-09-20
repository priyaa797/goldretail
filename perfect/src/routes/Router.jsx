import React, { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import ProtectedRoute from './ProtectedRoute';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));

/* ****Features***** */
const Dashboard = Loadable(lazy(() => import('../features/dashboard/Dashboard')));
const SalesList = Loadable(lazy(() => import('../features/sales/SalesList')));
const SalesForm = Loadable(lazy(() => import('../features/sales/SalesForm')));
const SalesDetails = Loadable(lazy(() => import('../features/sales/SalesDetails')));
const PurchaseList = Loadable(lazy(() => import('../features/purchase/PurchaseList')));
const PurchaseForm = Loadable(lazy(() => import('../features/purchase/PurchaseForm')));
const PurchaseDetails = Loadable(lazy(() => import('../features/purchase/PurchaseDetails')));
const PaymentScreen = Loadable(lazy(() => import('../features/payment/PaymentScreen')));
const PaymentHistory = Loadable(lazy(() => import('../features/payment/PaymentHistory')));
const StockBalance = Loadable(lazy(() => import('../features/reports/stock-balance/StockBalance')));
const CustomerOutstanding = Loadable(lazy(() => import('../features/reports/customer-outstanding/CustomerOutstanding')));
const Settings = Loadable(lazy(() => import('../features/settings/Settings')));
const ItemForm = Loadable(lazy(() => import('../features/master/ItemForm')));
const ItemList = Loadable(lazy(() => import('../features/master/ItemList')));
const ItemDetails = Loadable(lazy(() => import('../features/master/ItemDetails')));
const Catalog = Loadable(lazy(() => import('../features/master/Catalog')));

const Router = [
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <FullLayout />,
        children: [
          { path: '/', exact: true, element: <Dashboard /> },
          { path: '/sales', exact: true, element: <SalesList /> },
          { path: '/sales/new', exact: true, element: <SalesForm /> },
          { path: '/sales/:id', exact: true, element: <SalesDetails /> },
          { path: '/purchase', exact: true, element: <PurchaseList /> },
          { path: '/purchase/new', exact: true, element: <PurchaseForm /> },
          { path: '/purchase/:id', exact: true, element: <PurchaseDetails /> },
          { path: '/payment', exact: true, element: <PaymentScreen /> },
          { path: '/payment/:customer/history', exact: true, element: <PaymentHistory /> },
          { path: '/reports/stock-balance', exact: true, element: <StockBalance /> },
          { path: '/reports/customer-outstanding', exact: true, element: <CustomerOutstanding /> },
          { path: '/settings', exact: true, element: <Settings /> },
          { path: '/master/item', exact: true, element: <ItemList /> },
          { path: '/master/item/new', exact: true, element: <ItemForm /> },
          { path: '/master/item/:id', exact: true, element: <ItemDetails /> },
          { path: '/master/item/:id/edit', exact: true, element: <ItemForm /> },
          { path: '/master/catalog', exact: true, element: <Catalog /> },
          { path: '*', element: <Navigate to="/auth/404" /> },
        ],
      },
    ]
  },
  {
    path: '/auth',
    element: <BlankLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: '404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];
const router = createBrowserRouter(Router, { basename: '/perfect' });

export default router;
