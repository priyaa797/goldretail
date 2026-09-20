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
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconDashboard,
    href: '/',
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
    id: uniqueId(),
    title: 'Settings',
    icon: IconSettings,
    href: '/settings',
  },
];

export default Menuitems;
