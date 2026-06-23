"use client";

import * as React from 'react';
import { Box } from '@mui/material';
import Image from 'next/image';

export default function SitemarkIcon() {
  return (
    <Box sx={{display: 'flex',flexDirection:'column',justifyContent:'start',alignItems:'start'}}>
      <Image src="/images/favicon-slimbg.png" alt="logo" width={186} height={42} />
    </Box>
  );
}
