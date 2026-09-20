import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, ToggleButtonGroup, ToggleButton, Button, TextField, Divider } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { setDarkMode, setTheme, setDir } from 'src/store/customizer/CustomizerSlice';
import { Sun, Moon, Check, AlertOctagon, Palette } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import toast from 'react-hot-toast';

const thColors = [
  { id: 1, bgColor: '#5D87FF', disp: 'BLUE_THEME' },
  { id: 2, bgColor: '#0074BA', disp: 'AQUA_THEME' },
  { id: 3, bgColor: '#763EBD', disp: 'PURPLE_THEME' },
  { id: 4, bgColor: '#0A7EA4', disp: 'GREEN_THEME' },
  { id: 5, bgColor: '#01C0C8', disp: 'CYAN_THEME' },
  { id: 6, bgColor: '#FA896B', disp: 'ORANGE_THEME' },
  { id: 7, bgColor: '#E83E8C', disp: 'PINK_THEME' }, // Pink
  { id: 8, bgColor: '#FF4C51', disp: 'RED_THEME' },   // Red
  { id: 9, bgColor: '#475569', disp: 'SLATE_THEME' }, // Slate
];

export default function Settings() {
  const dispatch = useDispatch();
  const customizer = useSelector((state) => state.customizer);
  const mode = customizer.activeMode;
  const colorVariant = customizer.activeTheme;

  const [killImageUrl, setKillImageUrl] = useState("https://i.ytimg.com/vi/ivKX1NzyHII/maxresdefault.jpg");
  const { data: systemStatus } = useFrappeGetCall('goldretail.api.system.get_system_status', null, 'system_status_settings');
  const { call: triggerKillSwitch, loading: isKilling } = useFrappePostCall('goldretail.api.system.trigger_kill_switch');
  const { call: saveThemeAPI } = useFrappePostCall('goldretail.api.system.save_user_theme');

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

  const handleThemeChange = async (themeName) => {
    dispatch(setTheme(themeName));
    try {
      await saveThemeAPI({ theme_name: themeName });
    } catch (e) {
      console.error("Failed to save theme to backend", e);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>Settings</Typography>

      <Grid container spacing={3}>
        {/* Theme Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Palette size={24} color={customizer.activeMode === 'dark' ? '#fff' : '#000'} />
              <Typography variant="h6">Theme Color</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Choose your preferred accent color. This will be saved to your profile.
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={2}>
              {thColors.map((thcolor) => (
                <Box
                  key={thcolor.id}
                  onClick={() => handleThemeChange(thcolor.disp)}
                  sx={{
                    width: 48,
                    height: 48,
                    backgroundColor: thcolor.bgColor,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                    boxShadow: colorVariant === thcolor.disp ? '0 0 0 3px white, 0 0 0 5px ' + thcolor.bgColor : 'none',
                    '&:hover': { transform: 'scale(1.1)' }
                  }}
                >
                  {colorVariant === thcolor.disp && <Check color="white" size={20} />}
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
