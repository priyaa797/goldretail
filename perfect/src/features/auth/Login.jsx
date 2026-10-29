import React, { useState } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { setDarkMode, setTheme } from 'src/store/customizer/CustomizerSlice';
import { Box, Button, Typography } from '@mui/material';
import BlankCard from '../../components/shared/BlankCard';

import CustomTextField from '../../components/forms/theme-elements/CustomTextField';

import toast from 'react-hot-toast';

export default function Login() {
  const { login, currentUser } = useFrappeAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ username: email, password });
      toast.success('Logged in successfully!');

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
      } catch (err) {
        document.title = 'Prime';
      }

      navigate('/');
    } catch (err) {
      toast.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <BlankCard><Box sx={{ p: 4, maxWidth: 400, width: '100%' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Prime
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your details to sign in
      </Typography>
      <form onSubmit={handleSubmit}>
        <CustomTextField
          fullWidth
          margin="normal"
          label="Email or Username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <CustomTextField
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 3, py: 1.5 }}>
          Sign In
        </Button>
      </form>
    </Box></BlankCard>
  );
}
