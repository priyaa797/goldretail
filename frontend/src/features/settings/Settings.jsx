import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, ToggleButtonGroup, ToggleButton, Button, TextField } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { setThemeMode, setThemeColor } from '../../store/slices/settingsSlice';
import { Sun, Moon, Check, Save } from 'lucide-react';
import { themeColors } from '../../theme/colors';

export default function Settings() {
  const dispatch = useDispatch();
  const { mode, colorVariant } = useSelector(state => state.settings);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>Settings</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" mb={2}>Appearance</Typography>
            
            <Typography variant="body2" color="text.secondary" mb={1}>Mode</Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, val) => val && dispatch(setThemeMode(val))}
              fullWidth
              sx={{ mb: 3 }}
            >
              <ToggleButton value="light"><Sun size={18} style={{ marginRight: 8 }} /> Light</ToggleButton>
              <ToggleButton value="dark"><Moon size={18} style={{ marginRight: 8 }} /> Dark</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="body2" color="text.secondary" mb={1}>Theme Color</Typography>
            <Box display="flex" gap={2}>
              {Object.keys(themeColors).map(color => (
                <Box
                  key={color}
                  onClick={() => dispatch(setThemeColor(color))}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: themeColors[color].primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: colorVariant === color ? 3 : 1,
                    border: colorVariant === color ? '2px solid' : 'none',
                    borderColor: 'text.primary'
                  }}
                >
                  {colorVariant === color && <Check color="#fff" size={24} />}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
