
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router';
import router from './routes/Router'
import { Toaster } from 'react-hot-toast';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { setTheme, setDarkMode } from 'src/store/customizer/CustomizerSlice';

function App() {
  const theme = ThemeSettings();
  const customizer = useSelector((state) => state.customizer);
  const dispatch = useDispatch();

  const { data: userTheme } = useFrappeGetCall('goldretail.api.system.get_user_theme');
  const { data: deskTheme } = useFrappeGetCall('goldretail.api.system.get_desk_theme');
  const { call: setDeskTheme } = useFrappePostCall('goldretail.api.system.set_desk_theme');

  React.useEffect(() => {
    if (userTheme && userTheme.message) {
      dispatch(setTheme(userTheme.message));
    }
  }, [userTheme, dispatch]);

  React.useEffect(() => {
    if (deskTheme && deskTheme.message) {
      dispatch(setDarkMode(deskTheme.message.toLowerCase() === 'dark' ? 'dark' : 'light'));
    }
  }, [deskTheme, dispatch]);

  const initialRender = React.useRef(true);
  React.useEffect(() => {
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
      </RTL>
    </ThemeProvider>
  );
}

export default App
