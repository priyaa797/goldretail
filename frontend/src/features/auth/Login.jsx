import React, { useState } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, currentUser } = useFrappeAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ username: email, password })
      .then(() => {
        toast.success('Logged in successfully!');
        navigate('/');
      })
      .catch((err) => {
        toast.error('Login failed. Please check your credentials.');
      });
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Gold Retail
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your details to sign in
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          label="Email or Username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
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
    </Paper>
  );
}
