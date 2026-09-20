import React from 'react';
import DashboardCard from '../../../components/shared/DashboardCard';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  TableContainer,
} from '@mui/material';

const TopPerformers = ({ title, subtitle, columns = [], rows = [], action }) => {
  return (
    <DashboardCard title={title} subtitle={subtitle} action={action}>
      <TableContainer>
        <Table
          aria-label="simple table"
          sx={{
            whiteSpace: 'nowrap',
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col, idx) => (
                <TableCell key={idx} align={col.align || 'left'}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {col.label}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rIdx) => (
              <TableRow key={rIdx}>
                {columns.map((col, cIdx) => (
                  <TableCell key={cIdx} align={col.align || 'left'}>
                    {col.render ? col.render(row) : (
                      <Typography variant="subtitle2" color="textSecondary" fontWeight={400}>
                        {row[col.id]}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography variant="subtitle2" color="textSecondary" py={2}>
                    No data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardCard>
  );
};

export default TopPerformers;
