import { Box } from '@mui/material'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import SignInPage from './login';

export function generateStaticParams() {
  return [{ 'sign-in': [] }];
}

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();

  // Protect the route by checking if the user is signed in
  if (!userId) {
    return (
      <Box sx={{ width: '100%', minHeight: '100dvh' }}>
        <SignInPage />
      </Box>
    );
  }
  if (userId) {
    return redirect('/dashboard')
  }
}