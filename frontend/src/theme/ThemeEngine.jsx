import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useSelector } from 'react-redux';
import { getAppTheme } from './theme';

export function ThemeEngine({ children }) {
  const { mode, colorVariant } = useSelector((state) => state.settings);
  const theme = React.useMemo(() => getAppTheme(mode, colorVariant), [mode, colorVariant]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
