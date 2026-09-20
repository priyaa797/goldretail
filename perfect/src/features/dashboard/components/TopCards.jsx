import React from 'react';
import { Box, CardContent, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';

const TopCards = ({ cards = [] }) => {
  return (
    <Grid container spacing={3}>
      {cards.map((topcard, i) => (
        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={i}>
          <Box bgcolor={topcard.bgcolor + '.light'} textAlign="center">
            <CardContent>
              <img src={topcard.icon} alt={topcard.title} width="50" />
              <Typography
                color={topcard.bgcolor + '.main'}
                mt={1}
                variant="subtitle1"
                fontWeight={600}
              >
                {topcard.title}
              </Typography>
              <Typography color={topcard.bgcolor + '.main'} variant="h4" fontWeight={600}>
                {topcard.digits}
              </Typography>
            </CardContent>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default TopCards;
