
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { Toaster } from 'react-hot-toast';
import { useFrappeGetCall, useFrappePostCall, useFrappeEventListener, useFrappeAuth } from 'frappe-react-sdk';
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

  const executeRedirect = (target) => {
    if (!target) return;
    const targetUrl = (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('/'))
      ? target
      : `/${target}`;
    if (window.location.href !== targetUrl && window.location.pathname !== targetUrl) {
      window.location.replace(targetUrl);
    }
  };

  useEffect(() => {
    if (!systemDownState) return;

    const preEl = document.getElementById('pre-hydration-system-down');
    if (preEl) preEl.remove();

    if (systemDownState.is_down && systemDownState.redirect_url) {
      executeRedirect(systemDownState.redirect_url);
    }
  }, [systemDownState]);

  // Real-time socket listener
  useFrappeEventListener('system_down_toggled', (data) => {
    if (data && typeof data.is_down !== 'undefined') {
      setSystemDownState(data);
      if (data.is_down && data.redirect_url) {
        executeRedirect(data.redirect_url);
      }
    }
  });

  // Local window event listener (dispatched directly on kill switch trigger)
  useEffect(() => {
    const handleLocalToggle = (e) => {
      if (e.detail && typeof e.detail.is_down !== 'undefined') {
        setSystemDownState(e.detail);
        if (e.detail.is_down && e.detail.redirect_url) {
          executeRedirect(e.detail.redirect_url);
        }
      }
    };
    window.addEventListener('system_down_toggled', handleLocalToggle);
    return () => window.removeEventListener('system_down_toggled', handleLocalToggle);
  }, []);

  // Ensure inactive tabs immediately check and redirect when user switches back to them
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/method/goldretail.api.system.get_system_status')
          .then((r) => r.json())
          .then((data) => {
            const state = data.message || data;
            if (state && state.is_down) {
              setSystemDownState(state);
              if (state.redirect_url) {
                executeRedirect(state.redirect_url);
              }
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const { currentUser } = useFrappeAuth();
  const { data: userTheme, mutate: mutateUserTheme } = useFrappeGetCall('goldretail.api.system.get_user_theme');
  const { data: deskTheme, mutate: mutateDeskTheme } = useFrappeGetCall('goldretail.api.system.get_desk_theme');
  const { call: setDeskTheme } = useFrappePostCall('goldretail.api.system.set_desk_theme');

  const themeLoadedRef = useRef(false);

  useEffect(() => {
    if (userTheme && userTheme.message) {
      dispatch(setTheme(userTheme.message));
    }
  }, [userTheme, dispatch]);

  useEffect(() => {
    if (deskTheme && deskTheme.message) {
      themeLoadedRef.current = true;
      dispatch(setDarkMode(deskTheme.message.toLowerCase() === 'dark' ? 'dark' : 'light'));
    }
  }, [deskTheme, dispatch]);

  // Immediately check with Frappe as soon as user logs in / session detected
  useEffect(() => {
    if (currentUser) {
      mutateDeskTheme();
      mutateUserTheme();

      fetch('/api/method/goldretail.api.system.get_desk_theme')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.message) {
            themeLoadedRef.current = true;
            dispatch(setDarkMode(data.message.toLowerCase() === 'dark' ? 'dark' : 'light'));
          }
        })
        .catch(() => {});

      fetch('/api/method/goldretail.api.system.get_user_theme')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.message) {
            dispatch(setTheme(data.message));
          }
        })
        .catch(() => {});
    }
  }, [currentUser, dispatch, mutateDeskTheme, mutateUserTheme]);

  const initialRender = useRef(true);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (themeLoadedRef.current && currentUser) {
      setDeskTheme({ mode: customizer.activeMode });
    }
  }, [customizer.activeMode, currentUser]);

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
