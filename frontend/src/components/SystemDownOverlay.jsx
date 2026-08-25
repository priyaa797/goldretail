import React, { useState, useEffect } from 'react';
import { useFrappeGetCall, useFrappeEventListener } from 'frappe-react-sdk';
import { Box } from '@mui/material';

export default function SystemDownOverlay() {
  const [systemDown, setSystemDown] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // Initial fetch
  const { data } = useFrappeGetCall('goldretail.api.system.get_system_status', null, "system_status");

  useEffect(() => {
    if (data?.message) {
      setSystemDown(data.message.is_down);
      setImageUrl(data.message.image_url);
    } else if (data) {
      setSystemDown(data.is_down);
      setImageUrl(data.image_url);
    }
  }, [data]);

  // Real-time listener
  useFrappeEventListener('system_down_toggled', (eventData) => {
    setSystemDown(eventData.is_down);
    setImageUrl(eventData.image_url);
  });

  if (!systemDown) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {imageUrl && (
        <Box
          component="img"
          src={imageUrl}
          alt="System Down"
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      )}
    </Box>
  );
}
