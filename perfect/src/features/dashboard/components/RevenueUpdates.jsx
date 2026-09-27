import React from 'react';
import Chart from 'react-apexcharts';
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid2';
import { MenuItem, Stack, Typography, Button, Avatar, Box, CircularProgress } from '@mui/material';
import { IconGridDots } from '@tabler/icons-react';
import DashboardCard from '../../../components/shared/DashboardCard';
import CustomSelect from '../../../components/forms/theme-elements/CustomSelect';
import { useFrappeGetCall } from 'frappe-react-sdk';

const RevenueUpdates = () => {
  const generateMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      months.push({
        value: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: date.toLocaleString('default', { month: 'short', year: 'numeric' })
      });
      date.setMonth(date.getMonth() - 1);
    }
    return months;
  };
  const monthOptions = React.useMemo(() => generateMonths(), []);
  const [selectedPeriod, setSelectedPeriod] = React.useState(monthOptions[0].value);

  const [year, month] = selectedPeriod.split('-');
  const { data, isLoading } = useFrappeGetCall('goldretail.api.dashboard.get_revenue_updates', { year, month }, `revenue_${year}_${month}`);
  const revenueData = data?.message;

  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;

  // chart
  const optionscolumnchart = {
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: {
        show: true,
      },
      height: 370,
      stacked: true,
    },
    colors: [primary, theme.palette.warning.main, theme.palette.error.light, secondary],
    plotOptions: {
      bar: {
        horizontal: false,
        barHeight: '60%',
        columnWidth: '20%',
        borderRadius: [6],
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'all',
      },
    },

    stroke: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.1)',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => {
          return value >= 0 ? value.toFixed(0) : (-value).toFixed(0);
        }
      }
    },
    xaxis: {
      categories: ['1-5th', '6-10th', '11-15th', '16-20th', '21-25th', '26th-End'],
      axisBorder: {
        show: false,
      },
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      fillSeriesColor: false,
    },
  };
  const incomePaidSeries = revenueData ? revenueData.chart_data.income_paid : [0, 0, 0, 0, 0, 0];
  const incomePendingSeries = revenueData ? revenueData.chart_data.income_pending : [0, 0, 0, 0, 0, 0];
  const expensePaidSeries = revenueData ? revenueData.chart_data.expense_paid.map(v => -v) : [0, 0, 0, 0, 0, 0];
  const expensePendingSeries = revenueData ? revenueData.chart_data.expense_pending.map(v => -v) : [0, 0, 0, 0, 0, 0];

  const totalIncome = revenueData ? revenueData.total_income : 0;
  const pendingIncome = revenueData ? revenueData.pending_income : 0;
  const totalExpense = revenueData ? revenueData.total_expense : 0;
  const pendingExpense = revenueData ? revenueData.pending_expense : 0;

  const seriescolumnchart = [
    {
      name: 'Income (Paid)',
      data: incomePaidSeries,
    },
    {
      name: 'Income (Pending)',
      data: incomePendingSeries,
    },
    {
      name: 'Expense (Paid)',
      data: expensePaidSeries,
    },
    {
      name: 'Expense (Pending)',
      data: expensePendingSeries,
    },
  ];

  if (isLoading) {
    return (
      <DashboardCard title="Revenue Updates" subtitle="Overview of Profit">
        <Box display="flex" justifyContent="center" alignItems="center" height="370px">
          <CircularProgress />
        </Box>
      </DashboardCard>
    );
  }

  return (
    (<DashboardCard
      title="Revenue Updates"
      subtitle="Overview of Profit"
      action={
        <CustomSelect
          labelId="month-dd"
          id="month-dd"
          value={selectedPeriod}
          size="small"
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          {monthOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </CustomSelect>
      }
    >
      <Grid container spacing={3}>
        {/* column */}
        <Grid
          size={{ xs: 12, sm: 8 }}
        >
          <Box className="rounded-bars">
            <Chart
              options={optionscolumnchart}
              series={seriescolumnchart}
              type="bar"
              height="370px"
            />
          </Box>
        </Grid>
        {/* column */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Stack spacing={3} mt={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                width={40}
                height={40}
                bgcolor="primary.light"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography color="primary" variant="h6" display="flex">
                  <IconGridDots width={21} />
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3" fontWeight="700">
                  ₹{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Income
                </Typography>
              </Box>
            </Stack>
          </Stack>
          <Stack spacing={3} my={5}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                sx={{
                  width: 9,
                  height: 9,
                  bgcolor: theme.palette.warning.main,
                  marginTop: '10px !important',
                  svg: { display: 'none' },
                }}
              ></Avatar>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Pending from Customers
                </Typography>
                <Typography variant="h5" color="warning.main">₹{pendingIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                sx={{
                  width: 9,
                  height: 9,
                  bgcolor: theme.palette.error.light,
                  marginTop: '10px !important',
                  svg: { display: 'none' },
                }}
              ></Avatar>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Total Expense
                </Typography>
                <Typography variant="h5">₹{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                sx={{
                  width: 9,
                  height: 9,
                  bgcolor: secondary,
                  marginTop: '10px !important',
                  svg: { display: 'none' },
                }}
              ></Avatar>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Pending to Suppliers
                </Typography>
                <Typography variant="h5" color="error.main">₹{pendingExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
              </Box>
            </Stack>
          </Stack>
          <Button color="primary" variant="contained" fullWidth>
            View Full Report
          </Button>
        </Grid>
      </Grid>
    </DashboardCard>)
  );
};

export default RevenueUpdates;
