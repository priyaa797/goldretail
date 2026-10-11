
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { Toaster } from 'react-hot-toast';
import { useFrappeGetCall, useFrappePostCall, useFrappeEventListener } from 'frappe-react-sdk';
import { setTheme, setDarkMode } from 'src/store/customizer/CustomizerSlice';

function App() {
  const theme = ThemeSettings();
  const customizer = useSelector((state) => state.customizer);
  const dispatch = useDispatch();

  const [systemDownState, setSystemDownState] = useState(null);

  // Poll system status every 4 seconds to ensure it catches kill switch even if socket event is missed
  const { data: systemStatusData } = useFrappeGetCall(
    'goldretail.api.system.get_system_status',
    null,
    'system_status_global',
    { refreshInterval: 4000 }
  );

  useEffect(() => {
    if (systemStatusData) {
      const state = systemStatusData.message || systemStatusData;
      if (state && typeof state.is_down !== 'undefined') {
        setSystemDownState(state);
      }
    }
  }, [systemStatusData]);

  useEffect(() => {
    if (systemDownState) {
      const preEl = document.getElementById('pre-hydration-system-down');
      if (preEl) preEl.remove();
    }
  }, [systemDownState]);

  // Real-time socket listener
  useFrappeEventListener('system_down_toggled', (data) => {
    if (data && typeof data.is_down !== 'undefined') {
      setSystemDownState(data);
    }
  });

  // Local window event listener (dispatched directly on kill switch trigger)
  useEffect(() => {
    const handleLocalToggle = (e) => {
      if (e.detail && typeof e.detail.is_down !== 'undefined') {
        setSystemDownState(e.detail);
      }
    };
    window.addEventListener('system_down_toggled', handleLocalToggle);
    return () => window.removeEventListener('system_down_toggled', handleLocalToggle);
  }, []);

  const { data: userTheme } = useFrappeGetCall('goldretail.api.system.get_user_theme');
  const { data: deskTheme } = useFrappeGetCall('goldretail.api.system.get_desk_theme');
  const { call: setDeskTheme } = useFrappePostCall('goldretail.api.system.set_desk_theme');

  useEffect(() => {
    if (userTheme && userTheme.message) {
      dispatch(setTheme(userTheme.message));
    }
  }, [userTheme, dispatch]);

  useEffect(() => {
    if (deskTheme && deskTheme.message) {
      dispatch(setDarkMode(deskTheme.message.toLowerCase() === 'dark' ? 'dark' : 'light'));
    }
  }, [deskTheme, dispatch]);

  const initialRender = useRef(true);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    setDeskTheme({ mode: customizer.activeMode });
  }, [customizer.activeMode]);

  return (
    <ThemeProvider theme={theme}>
      <RTL direction={customizer.activeDir}>
        <CssBaseline />
        <Toaster position="top-right" />
        <RouterProvider router={router} />
        {systemDownState?.is_down && (
          <Box
            id="system-down-overlay"
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999999,
              bgcolor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {systemDownState.image_url && (
              <Box
                component="img"
                src={systemDownState.image_url}
                alt="System Down"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            )}
          </Box>
        )}
      </RTL>
    </ThemeProvider>
  );
}

export default App;
