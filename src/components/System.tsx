"use client"
import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

const tiers = [
  {
    title: 'School Management System',
    price: '0',
    description: [
    'Landing Page(optional)',
    'Dashboard',
    'Student Portal',
    "Teacher's Portal",
    "Parent's Portal"
    ],
    buttonText: 'Try demo',
    buttonVariant: 'outlined',
    buttonColor: 'primary',
    link:"https://the-school-demo.vercel.app"
  },
  {
    title: 'Thinking Minds',
    subheader: 'Recommended',
    price: '149',
    description: [
    "Dashboard (KPIs, shortcuts)",
    "HR Management",
    "Inventory Management",
    "IT & Asset Management",
    "Finance (Invoices, Payments, Expenses)",
    "Helpdesk / Ticketing",
    "CRM (Contacts, Sales Pipeline)",
    "Project & Task Management",
    "Payroll (Salaries, Payslips)",
    "Procurement / Purchase Orders",
    "Notifications (Email/In-app)",
    "Audit Logs",
    "i18n + Multi-Currency support"
    ],
    buttonText: 'Try Demo',
    buttonVariant: 'contained',
    buttonColor: 'success',
    link:"https://thinking-minds-demo.vercel.app"
  },
  {
    title: 'Fulgul : The Spark',
    price: '99',
    description: [
    "Simulate attacks",
    "Harden systems",
    "Detect vulnerabilities",
    "Respond automatically"
    ],
    buttonText: 'Try Demo',
    buttonVariant: 'outlined',
    buttonColor: 'primary',
    link:"https://fulgul-demo.vercel.app"
  },
];

export default function System() {
  return (
    <Container
      id="pricing"
      sx={{
        pt: { xs: 2, sm: 2 },
        pb: { xs: 2, sm: 2 },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 2, sm: 2 },
      }}
    >
      <Box
        sx={{
          width: { sm: '100%', md: '60%' },
          textAlign: { sm: 'left', md: 'center' },
        }}
      >
        <Typography
          component="h2"
          variant="h4"
          gutterBottom
          sx={{ color: 'text.primary' }}
        >
          TRY NOW
        </Typography>
      
      </Box>
      <Grid
        container
        spacing={3}
        sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}
      >
        {tiers.map((tier,index) => (
          <Grid
            size={{ xs: 12, sm: tier.title === 'Parent Portal' ? 12 : 6, md: 4 }}
            key={tier.title}
          >
            <Card
              sx={[
                {
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                },
                index===1 &&
                  ((theme) => ({
                    border: 'none',
                    background:
                      'radial-gradient(circle at 50% 0%, hsl(220, 20%, 35%), hsl(220, 30%, 6%))',
                    boxShadow: `0 8px 12px hsla(220, 20%, 42%, 0.2)`,
                    ...theme.applyStyles('dark', {
                      background:
                        'radial-gradient(circle at 50% 0%, hsl(220, 20%, 20%), hsl(220, 30%, 16%))',
                      boxShadow: `0 8px 12px hsla(0, 0%, 0%, 0.8)`,
                    }),
                  })),
              ]}
            >
              <CardContent>
                <Box
                  sx={[
                    {
                      mb: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                    },
                    index===1
                      ? { color: 'grey.100' }
                      : { color: '' },
                  ]}
                >
                  <Typography component="h3" variant="h6">
                    {tier.title}
                  </Typography>
                  {index===1 && (
                    <Chip icon={<AutoAwesomeIcon />} label={tier.subheader} />
                  )}
                </Box>
                <Divider sx={{ my: 2, opacity: 0.8, borderColor: 'divider' }} />
                {tier.description.map((line) => (
                  <Box
                    key={line}
                    sx={{ py: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}
                  >
                    <CheckCircleRoundedIcon
                      sx={[
                        {
                          width: 20,
                        },
                        index===1
                          ? { color: 'primary.light' }
                          : { color: 'primary.main' },
                      ]}
                    />
                    <Typography
                      variant="subtitle2"
                      component={'span'}
                      sx={[
                        index===1
                          ? { color: 'grey.50' }
                          : { color: null },
                      ]}
                    >
                      {line}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  href={tier.link}
                  variant={tier.buttonVariant as 'outlined' | 'contained'}
                  color={tier.buttonColor as 'primary' | 'secondary' | 'success'}
                >
                  {tier.buttonText}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
