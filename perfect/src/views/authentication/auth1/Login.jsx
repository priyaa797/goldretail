import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useDispatch } from 'react-redux';
import { setDarkMode, setTheme } from 'src/store/customizer/CustomizerSlice';
import toast from 'react-hot-toast';

import PageContainer from 'src/components/container/PageContainer';
import img1 from 'src/assets/images/backgrounds/login-bg.svg';
import Logo from 'src/layouts/full/shared/logo/Logo';
import AuthLogin from '../authForms/AuthLogin';

const Login = () => {
  const { login, currentUser } = useFrappeAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      await login({ username: email, password });
      toast.success('Logged in successfully!');

      // Check theme and title with Frappe as soon as we login
      try {
        const [deskRes, userRes, titleRes] = await Promise.allSettled([
          fetch('/api/method/goldretail.api.system.get_desk_theme').then((r) => r.json()),
          fetch('/api/method/goldretail.api.system.get_user_theme').then((r) => r.json()),
          fetch('/api/method/goldretail.api.system.get_app_title').then((r) => r.json()),
        ]);

        if (deskRes.status === 'fulfilled' && deskRes.value?.message) {
          const mode = deskRes.value.message.toLowerCase() === 'dark' ? 'dark' : 'light';
          dispatch(setDarkMode(mode));
        }

        if (userRes.status === 'fulfilled' && userRes.value?.message) {
          dispatch(setTheme(userRes.value.message));
        }

        const appTitle = (titleRes.status === 'fulfilled' && titleRes.value?.message) || 'Prime';
        document.title = appTitle;
      } catch (e) {
        document.title = 'Prime';
      }

      navigate('/');
    } catch (err) {
      setLoading(false);
      toast.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <PageContainer title="Login" description="Login to Prime">
      <Grid container spacing={0} sx={{ overflowX: 'hidden' }}>
        <Grid
          size={{ xs: 12, sm: 12, lg: 7, xl: 8 }}
          sx={{
            position: 'relative',
            '&:before': {
              content: '""',
              background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
              backgroundSize: '400% 400%',
              animation: 'gradient 15s ease infinite',
              position: 'absolute',
              height: '100%',
              width: '100%',
              opacity: '0.3',
            },
          }}
        >
          <Box position="relative">
            <Box px={3}>
              <Logo />
            </Box>
            <Box
              alignItems="center"
              justifyContent="center"
              height={'calc(100vh - 75px)'}
              sx={{
                display: {
                  xs: 'none',
                  lg: 'flex',
                },
              }}
            >
              <img
                src={img1}
                alt="bg"
                style={{
                  width: '100%',
                  maxWidth: '500px',
                }}
              />
            </Box>
          </Box>
        </Grid>
        <Grid
          size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <Box p={4}>
            <AuthLogin
              title="Welcome to Prime"
              loading={loading}
              onSubmit={handleLogin}
              subtext={
                <Typography variant="subtitle1" color="textSecondary" mb={1}>
                  Your Admin Dashboard
                </Typography>
              }
            />
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Login;
