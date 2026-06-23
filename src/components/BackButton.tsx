"use client";

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  onClick?: () => void;
  tooltip?: string;
}

export default function BackButton({ onClick, tooltip = "Go back" }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={handleClick}
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ArrowBack />
      </IconButton>
    </Tooltip>
  );
}
