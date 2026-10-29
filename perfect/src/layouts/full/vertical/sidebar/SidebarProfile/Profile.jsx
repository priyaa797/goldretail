import React from 'react';
import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconPower } from '@tabler/icons-react';
import { useNavigate } from "react-router";
import { useFrappeAuth, useFrappeGetDoc } from 'frappe-react-sdk';

export const Profile = () => {
  const { logout, currentUser } = useFrappeAuth();
  const { data: user } = useFrappeGetDoc('User', currentUser || null);
  const navigate = useNavigate();
  const customizer = useSelector((state) => state.customizer);
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
  
  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const displayName = user?.first_name || user?.full_name || currentUser || 'Admin';
  
  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt={displayName} src={user?.user_image || img1} />

          <Box>
            <Typography variant="h6" color="textPrimary">{displayName}</Typography>
            <Typography variant="caption" color="textSecondary">Admin</Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton color="primary" onClick={handleLogout} aria-label="logout" size="small">
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
