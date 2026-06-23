"use client"
import * as React from 'react';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/auth/client';
import { Chip } from '@mui/material';
const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

export default function NavbarBreadcrumbs() {
  const pathname=usePathname()
  const { user } = useUser()
  const companyName = user?.publicMetadata?.companyName || "Default Company"

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <Chip label={companyName.toString()} sx={{py:1.5}} color='primary'/>
      {pathname.split('/').filter(x=>x!=="").map(x=>
        <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {x[0].toUpperCase()}{x.slice(1,x.length)}
        </Typography>
      )}
    </StyledBreadcrumbs>
  );
}
