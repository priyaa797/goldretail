import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

export default function ExpandableItemName({ text, limit = 30 }) {
  const [expanded, setExpanded] = useState(false);
  const name = text || '';

  if (!name) return <Typography variant="body2">-</Typography>;
  if (name.length <= limit) return <Typography variant="body2">{name}</Typography>;

  return (
    <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.35 }}>
      {expanded ? (
        <>
          {name}{' '}
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.75rem',
              textDecoration: 'underline',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { color: 'primary.dark' }
            }}
          >
            (less)
          </Box>
        </>
      ) : (
        <>
          {name.slice(0, limit)}
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.75rem',
              textDecoration: 'underline',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              ml: 0.5,
              '&:hover': { color: 'primary.dark' }
            }}
          >
            ...more
          </Box>
        </>
      )}
    </Typography>
  );
}
