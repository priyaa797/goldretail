import { createTheme } from '@mui/material/styles';
import { themeColors } from './colors';

export const getAppTheme = (mode, colorVariant) => {
  const colors = themeColors[colorVariant] || themeColors.blue;

  const softShadow = 'rgba(145, 158, 171, 0.2) 0px 4px 16px 0px, rgba(145, 158, 171, 0.12) 0px 8px 32px -4px';
  const darkShadow = 'rgba(0, 0, 0, 0.2) 0px 4px 16px 0px, rgba(0, 0, 0, 0.4) 0px 8px 32px -4px';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
      },
      secondary: {
        main: colors.secondary,
      },
      background: {
        default: mode === 'light' ? '#f9fafb' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#212b36',
      },
      text: {
        primary: mode === 'light' ? '#111827' : '#ffffff',
        secondary: mode === 'light' ? '#4B5563' : '#9ca3af',
      }
    },
    shape: {
      borderRadius: 20,
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 800 },
      h2: { fontSize: '2rem', fontWeight: 800 },
      h3: { fontSize: '1.5rem', fontWeight: 800 },
      h4: { fontSize: '1.25rem', fontWeight: 800 },
      h5: { fontSize: '1.125rem', fontWeight: 800 },
      h6: { fontSize: '1rem', fontWeight: 700 },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 600, fontSize: '0.875rem' },
      body1: { fontWeight: 500 },
      body2: { fontWeight: 500 },
      button: { fontWeight: 700 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '12px',
            fontWeight: 800,
            padding: '10px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: mode === 'light' ? 'rgba(145, 158, 171, 0.3) 0px 8px 16px 0px' : 'none',
            }
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '24px',
            boxShadow: mode === 'light' ? softShadow : darkShadow,
            backgroundImage: 'none',
            border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' ? softShadow : darkShadow,
            backgroundImage: 'none',
          },
          elevation1: { boxShadow: mode === 'light' ? softShadow : darkShadow },
          elevation2: { boxShadow: mode === 'light' ? softShadow : darkShadow },
          elevation3: { boxShadow: mode === 'light' ? softShadow : darkShadow },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: mode === 'light' ? '1px dashed rgba(145, 158, 171, 0.24)' : '1px dashed rgba(255, 255, 255, 0.12)',
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: 'none',
              backgroundColor: mode === 'light' ? '#f4f6f8' : '#28323d',
              borderRadius: '8px',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
              color: mode === 'light' ? '#637381' : '#919eab',
            },
          },
        },
      },
    },
  });
};
