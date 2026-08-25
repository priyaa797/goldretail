import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, ToggleButtonGroup, ToggleButton, Button, TextField, Divider } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { setThemeMode, setThemeColor } from '../../store/slices/settingsSlice';
import { Sun, Moon, Check, AlertOctagon } from 'lucide-react';
import { themeColors } from '../../theme/colors';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import toast from 'react-hot-toast';

export default function Settings() {
  const dispatch = useDispatch();
  const { mode, colorVariant } = useSelector(state => state.settings);

  const [killImageUrl, setKillImageUrl] = useState("https://i.ytimg.com/vi/ivKX1NzyHII/maxresdefault.jpg");
  const { data: systemStatus } = useFrappeGetCall('goldretail.api.system.get_system_status', null, 'system_status_settings');
  const { call: triggerKillSwitch, loading: isKilling } = useFrappePostCall('goldretail.api.system.trigger_kill_switch');

  const handleKillSwitch = async () => {
    if (window.confirm("WARNING: This will instantly take down the system for ALL users. Are you sure?")) {
      try {
        await triggerKillSwitch({ image_url: killImageUrl });
        toast.success("System has been taken down.");
      } catch (e) {
        toast.error("Failed to trigger kill switch.");
      }
    }
  };

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

        {(systemStatus?.message?.is_system_manager || systemStatus?.is_system_manager) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'error.main' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2} color="error.main">
                <AlertOctagon size={24} />
                <Typography variant="h6">System Administration (Danger Zone)</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={2}>
                The Kill Switch instantly disables the system for all active users without requiring a page refresh.
                Users will see the image specified below. Recovery requires backend intervention.
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="System Down Image URL"
                    value={killImageUrl}
                    onChange={(e) => setKillImageUrl(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    onClick={handleKillSwitch}
                    disabled={isKilling}
                    startIcon={<AlertOctagon size={18} />}
                  >
                    {isKilling ? 'Triggering...' : 'TRIGGER KILL SWITCH'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
