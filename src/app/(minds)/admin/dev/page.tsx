import { Box } from '@mui/material';
import OverridesEditor from './OverridesEditor';
import { assertOwnerOrDeveloper } from '@/lib/module-access-server';
import { notFound } from 'next/navigation';

export default async function DevOverridesPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  try {
    await assertOwnerOrDeveloper();
  } catch {
    notFound();
  }
  return (
    <Box sx={{ width: '100%' }}>
      <OverridesEditor />
    </Box>
  );
}

