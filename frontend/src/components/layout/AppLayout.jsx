import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, Toolbar, IconButton, Typography, Button, useTheme, useMediaQuery, alpha } from '@mui/material';
import { Menu, Home, ShoppingCart, Store, Receipt, BarChart, Settings, LogOut } from 'lucide-react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { Toaster } from 'react-hot-toast';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Home', icon: <Home size={20} />, path: '/' },
  { text: 'Purchase', icon: <ShoppingCart size={20} />, path: '/purchase' },
  { text: 'Sale', icon: <Store size={20} />, path: '/sales' },
  { text: 'Payment', icon: <Receipt size={20} />, path: '/payment' },
  { text: 'Stock Balance', icon: <BarChart size={20} />, path: '/reports/stock-balance' },
  { text: 'Customer Outstanding', icon: <BarChart size={20} />, path: '/reports/customer-outstanding' },
  { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useFrappeAuth();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    logout().then(() => navigate('/login'));
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="900" color="primary">Gold Retail</Typography>
      </Box>
      <List sx={{ flex: 1, px: 2 }}>
        {menuItems.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem 
              button 
              key={item.text} 
              onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
              sx={{
                mb: 1,
                borderRadius: '8px',
                bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
                color: active ? 'primary.main' : 'text.secondary',
                '&:hover': {
                  bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.16) : 'action.hover',
                  color: active ? 'primary.main' : 'text.primary',
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 600 : 500, fontSize: '0.875rem' }} />
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Button fullWidth variant="outlined" color="inherit" startIcon={<LogOut size={18} />} onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" elevation={0} sx={{ width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` }, bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px dashed', borderColor: 'divider' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}>
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {menuItems.find(i => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path)))?.text || 'Gold Retail'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, bgcolor: 'action.selected', px: 2, py: 1, borderRadius: 8 }}>
            {currentUser}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px dashed', borderColor: 'divider' } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
        <Toaster position="top-right" />
      </Box>
    </Box>
  );
}
