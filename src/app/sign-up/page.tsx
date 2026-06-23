"use client";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MuiCard from '@mui/material/Card';
import { styled, alpha } from '@mui/material/styles';
import Image from 'next/image';
import LoginForm from '@/components/LoginForm';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(3),
  gap: theme.spacing(2.5),
  margin: 'auto',
  maxWidth: '560px',
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  borderRadius: theme.spacing(3),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100dvh',
  width: '100%',
  padding: theme.spacing(2),
}));

export default function SignUpPage() {
  return (
    <SignUpContainer direction="column" justifyContent="center" alignItems="center">
      <Card variant="outlined">
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Image src="/favicon-slimbg.png" alt="logo" width={280} height={75} priority />
        </Box>
        <Typography variant="h5" textAlign="center" fontWeight={700}>
          Create company account
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Sign up with username/password and create your company owner account.
        </Typography>
        <LoginForm initialMode="register" registerOnly />
      </Card>
    </SignUpContainer>
  );
}
