import {
  IconDashboard,
  IconShoppingCart,
  IconTruckDelivery,
  IconCash,
  IconReportAnalytics,
  IconSettings,
  IconPoint,
} from '@tabler/icons-react';

import { uniqueId } from 'lodash';

const Menuitems = [
  {
    navlabel: true,
    subheader: 'Home',
  },
  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconDashboard,
    href: '/',
  },
  {
    navlabel: true,
    subheader: 'Master',
  },
  {
    id: uniqueId(),
    title: 'Item',
    icon: IconPoint,
    href: '/master/item',
  },
  {
    id: uniqueId(),
    title: 'Catalog',
    icon: IconPoint,
    href: '/master/catalog',
  },
  {
    navlabel: true,
    subheader: 'Operations',
  },
  {
    id: uniqueId(),
    title: 'Sales',
    icon: IconShoppingCart,
    href: '/sales',
  },
  {
    id: uniqueId(),
    title: 'Purchases',
    icon: IconTruckDelivery,
    href: '/purchase',
  },
  {
    id: uniqueId(),
    title: 'Payments',
    icon: IconCash,
    href: '/payment',
  },
  {
    navlabel: true,
    subheader: 'Analytics',
  },
  {
    id: uniqueId(),
    title: 'Reports',
    icon: IconReportAnalytics,
    href: '/reports',
    children: [
      {
        id: uniqueId(),
        title: 'Stock Balance',
        icon: IconPoint,
        href: '/reports/stock-balance',
      },
      {
        id: uniqueId(),
        title: 'Customer Outstanding',
        icon: IconPoint,
        href: '/reports/customer-outstanding',
      }
    ]
  },
  {
    navlabel: true,
    subheader: 'Configuration',
  },
  {
    id: uniqueId(),
    title: 'Settings',
    icon: IconSettings,
    href: '/settings',
  },
];

export default Menuitems;
