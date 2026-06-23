'use client'
import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled, alpha } from '@mui/material/styles';
import AppTheme from '@/shared-theme/AppTheme';
import ColorModeSelect from '@/shared-theme/ColorModeSelect';
import { Alert, AlertTitle, TextField, Autocomplete, CircularProgress, Chip, Fade } from '@mui/material';
import { useUser } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { createCompany, requestToJoinCompany } from './actions';
import { searchOrgsBridge } from '@/lib/desktop/orgs-bridge';
import { Business, GroupAdd, Search, CheckCircle, Pending } from '@mui/icons-material';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    maxWidth: '550px',
  },
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
  borderRadius: 24,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

const OptionCard = styled(MuiCard)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: theme.spacing(3),
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: `2px solid ${selected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3)}`,
  borderRadius: 16,
  background: selected
    ? alpha(theme.palette.primary.main, 0.1)
    : theme.palette.background.paper,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`,
    borderColor: theme.palette.primary.main,
  },
}));

type Mode = 'select' | 'create' | 'join';

export default function InfoForm() {
  const [mode, setMode] = React.useState<Mode>('select');
  const [companyName, setCompanyName] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCompany, setSelectedCompany] = React.useState<any>(null);
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const { user } = useUser();
  const router = useRouter();

  // Check if user has pending request
  React.useEffect(() => {
    if (user?.publicMetadata?.role === 'pending' && user?.publicMetadata?.pendingCompanyId) {
      setMode('join');
      setSuccess('Your join request is pending approval. You will be notified once approved.');
    }
  }, [user]);

  // Search companies when query changes
  React.useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(async () => {
        setSearching(true);
        const result = await searchOrgsBridge(searchQuery, 10);
        if (result.success && result.data) {
          setCompanies(result.data);
        }
        setSearching(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCompanies([]);
    }
  }, [searchQuery]);

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await createCompany(companyName.trim());
      if (res.error === '') {
        setSuccess('Company created successfully! Redirecting...');
        await user?.reload();
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!selectedCompany) {
      setError('Please select a company to join');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await requestToJoinCompany(selectedCompany._id.toString());
      if (res.error === '') {
        setSuccess(
          'Join request submitted! You will be able to access the platform once the company owner approves your request.'
        );
        // Don't redirect - user needs to wait for approval
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />
        <Card variant="outlined">
          <Typography variant="h4" sx={{ width: '100%', textAlign: 'center', fontWeight: 700 }}>
            Welcome! Let's get started
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
            Create a new company or join an existing one
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {mode === 'select' && (
            <Box>
              <Stack spacing={2}>
                <OptionCard selected={false} onClick={() => setMode('create')}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha('#667eea', 0.1),
                        color: '#667eea',
                      }}
                    >
                      <Business />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Create New Company
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Start your own company and become the owner
                      </Typography>
                    </Box>
                  </Stack>
                </OptionCard>

                <OptionCard selected={false} onClick={() => setMode('join')}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha('#00b894', 0.1),
                        color: '#00b894',
                      }}
                    >
                      <GroupAdd />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Join Existing Company
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Request to join a company (requires owner approval)
                      </Typography>
                    </Box>
                  </Stack>
                </OptionCard>
              </Stack>
            </Box>
          )}

          {mode === 'create' && (
            <Box
              component="form"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: 2,
              }}
            >
              <Button
                variant="text"
                onClick={() => setMode('select')}
                sx={{ alignSelf: 'flex-start', mb: 1 }}
              >
                ← Back
              </Button>
              <FormControl>
                <FormLabel sx={{ fontWeight: 'bold', mb: 1 }} htmlFor="company-name">
                  Company Name
                </FormLabel>
                <TextField
                  type="text"
                  placeholder="Enter your company name"
                  required
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  fullWidth
                />
              </FormControl>
              {error && (
                <Alert severity="error">
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" icon={<CheckCircle />}>
                  <AlertTitle>Success</AlertTitle>
                  {success}
                </Alert>
              )}
              <Button
                variant="contained"
                onClick={handleCreateCompany}
                disabled={loading || !companyName.trim()}
                sx={{ mt: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Company'}
              </Button>
            </Box>
          )}

          {mode === 'join' && (
            <Box
              component="form"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: 2,
              }}
            >
              <Button
                variant="text"
                onClick={() => {
                  setMode('select');
                  setSelectedCompany(null);
                  setSearchQuery('');
                }}
                sx={{ alignSelf: 'flex-start', mb: 1 }}
              >
                ← Back
              </Button>
              <FormControl>
                <FormLabel sx={{ fontWeight: 'bold', mb: 1 }} htmlFor="company-search">
                  Search for Company
                </FormLabel>
                <Autocomplete
                  options={companies}
                  getOptionLabel={(option) => option.name || ''}
                  loading={searching}
                  value={selectedCompany}
                  onChange={(event, newValue) => {
                    setSelectedCompany(newValue);
                    setError('');
                  }}
                  onInputChange={(event, newInputValue) => {
                    setSearchQuery(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type to search for a company..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                        endAdornment: (
                          <>
                            {searching ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option._id.toString()}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                        <Business sx={{ color: 'primary.main' }} />
                        <Typography>{option.name}</Typography>
                      </Stack>
                    </Box>
                  )}
                  noOptionsText={
                    searchQuery.length < 2
                      ? 'Type at least 2 characters to search'
                      : 'No companies found'
                  }
                />
              </FormControl>
              {selectedCompany && (
                <Fade in>
                  <Alert severity="info" icon={<Pending />}>
                    <AlertTitle>Pending Approval</AlertTitle>
                    You will need to wait for the company owner to approve your request before
                    you can access the platform.
                  </Alert>
                </Fade>
              )}
              {error && (
                <Alert severity="error">
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" icon={<CheckCircle />}>
                  <AlertTitle>Request Submitted</AlertTitle>
                  {success}
                </Alert>
              )}
              <Button
                variant="contained"
                onClick={handleJoinCompany}
                disabled={loading || !selectedCompany}
                sx={{ mt: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Request to Join'}
              </Button>
            </Box>
          )}
        </Card>
      </SignInContainer>
    </AppTheme>
  );
}
